package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/invopop/jsonschema"
	"github.com/meszmate/smartnotes/internal/models"
	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	tiktoken "github.com/pkoukk/tiktoken-go"
)

type Response struct {
	ID            string                `json:"id"`
	Title         string                `json:"title"`
	Summary       string                `json:"summary"`
	Flashcards    []models.Flashcard    `json:"flashcards"`
	QuizQuestions []models.QuizQuestion `json:"quiz_questions"`
}

type AIClient struct {
	client            openai.Client
	rateLimitInterval time.Duration
	tokenLimit        int

	mu         sync.Mutex
	usedTokens int
	lastReset  time.Time
}

var (
	ErrRateLimitReached = errors.New("rate limit reached, please try again later")
)

func GenerateSchema[T any]() *jsonschema.Schema {
	reflector := jsonschema.Reflector{
		AllowAdditionalProperties: false,
		DoNotReference:            true,
	}
	var v T
	return reflector.Reflect(v)
}

var ResponseSchema = GenerateSchema[models.Response]()

func NewAIClient(apiKey string, rateLimitInterval time.Duration, tokenLimit int) *AIClient {
	return &AIClient{
		client:            openai.NewClient(option.WithAPIKey(apiKey)),
		rateLimitInterval: rateLimitInterval,
		tokenLimit:        tokenLimit,
		lastReset:         time.Now(),
	}
}

func estimateTokens(text string) (int, error) {
	enc, err := tiktoken.GetEncoding("cl100k_base")
	if err != nil {
		return 0, err
	}
	tokens := enc.Encode(text, nil, nil)
	return len(tokens), nil
}

// Difficulty level descriptions for AI prompts
func getDifficultyPrompt(difficulty string) string {
	switch difficulty {
	case "beginner":
		return `
Difficulty level: BEGINNER
- Use simple, everyday vocabulary
- Focus on basic, fundamental concepts
- Keep answers short and straightforward
- Avoid technical jargon
- Create questions that test recognition and basic recall`
	case "advanced":
		return `
Difficulty level: ADVANCED
- Use precise technical terminology
- Include complex, nuanced concepts
- Explore deeper implications and connections
- Create questions that test analysis and application
- Include some challenging edge cases`
	default:
		return `
Difficulty level: STANDARD
- Use appropriate vocabulary for the subject
- Cover key concepts thoroughly
- Balance simplicity with accuracy
- Create well-rounded study materials`
	}
}

// GenerateWithOptions generates study materials with difficulty and count options
func (a *AIClient) GenerateWithOptions(ctx context.Context, text string, includeSummary, includeFlashcards, includeQuiz bool, difficulty string, flashcardCount, quizCount int) (*Response, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Reset token usage when interval has passed
	if time.Since(a.lastReset) >= a.rateLimitInterval {
		a.usedTokens = 0
		a.lastReset = time.Now()
	}

	approxTokens, err := estimateTokens(text)
	if err != nil {
		fmt.Printf("[ERROR] Failed to estimate tokens: %v", err)
		return nil, errors.New("failed to estimate tokens")
	}

	// Check token limit within the current interval
	if a.tokenLimit > 0 && a.usedTokens+approxTokens > a.tokenLimit {
		return nil, fmt.Errorf("%w: used %d / %d tokens in current window", ErrRateLimitReached, a.usedTokens, a.tokenLimit)
	}

	a.usedTokens += approxTokens

	taskList := ""
	if includeSummary {
		taskList += "1. Write a short, clear summary of the text.\n"
	}
	if includeFlashcards {
		taskList += fmt.Sprintf("2. Create exactly %d study flashcards (Q/A pairs).\n", flashcardCount)
	}
	if includeQuiz {
		taskList += fmt.Sprintf("3. Generate exactly %d multiple-choice quiz questions with 4 options each and mark the correct one.\n", quizCount)
	}
	if taskList == "" {
		return &Response{
			ID: uuid.NewString(),
		}, nil
	}

	difficultyPrompt := getDifficultyPrompt(difficulty)

	instructions := fmt.Sprintf(`Perform the following tasks on this text:
%s
%s

If a section is not requested, leave it empty.

Text:
%s`, taskList, difficultyPrompt, text)

	schemaParam := openai.ResponseFormatJSONSchemaJSONSchemaParam{
		Name:        "smartnotes_output",
		Description: openai.String("Structured AI output containing a summary, study flashcards, and multiple-choice quiz questions for student learning."),
		Schema:      ResponseSchema,
		Strict:      openai.Bool(true),
	}

	req := openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4oMini,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage("You are an educational assistant that outputs structured JSON for study materials. Always produce exactly the number of items requested."),
			openai.UserMessage(instructions),
		},
		ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
			OfJSONSchema: &openai.ResponseFormatJSONSchemaParam{JSONSchema: schemaParam},
		},
	}

	resp, err := a.client.Chat.Completions.New(ctx, req)
	if err != nil {
		fmt.Printf("[ERROR] OpenAI API call failed: %v\n", err)
		return nil, fmt.Errorf("AI service is currently unavailable")
	}

	var parsed models.Response
	if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &parsed); err != nil {
		fmt.Printf("[ERROR] JSON parse failed: %v\nRaw: %s\n", err, resp.Choices[0].Message.Content)
		return nil, fmt.Errorf("failed to process AI response")
	}

	if !includeSummary {
		parsed.Summary = ""
	}
	if !includeFlashcards {
		parsed.Flashcards = []models.Flashcard{}
	}
	if !includeQuiz {
		parsed.QuizQuestions = []models.QuizQuestion{}
	}

	return &Response{
		ID:            uuid.NewString(),
		Title:         parsed.Title,
		Summary:       parsed.Summary,
		Flashcards:    parsed.Flashcards,
		QuizQuestions: parsed.QuizQuestions,
	}, nil
}

// StreamTutorResponse streams AI tutor response for chat
func (a *AIClient) StreamTutorResponse(ctx context.Context, materialContext string, history []models.ChatMessage, userMessage string, responseChan chan<- string) error {
	// Build conversation history
	var messages []openai.ChatCompletionMessageParamUnion

	systemPrompt := fmt.Sprintf(`You are an AI tutor helping a student learn. Be helpful, encouraging, and educational.

Context about the study material:
%s

Guidelines:
- Answer questions based on the study material
- Explain concepts clearly and concisely
- Provide examples when helpful
- Encourage the student's learning
- If the question is unrelated to the material, politely redirect to the topic
- Use Hungarian language if the student writes in Hungarian, otherwise use English`, materialContext)

	messages = append(messages, openai.SystemMessage(systemPrompt))

	// Add conversation history
	for _, msg := range history {
		if msg.Role == models.ChatRoleUser {
			messages = append(messages, openai.UserMessage(msg.Content))
		} else {
			messages = append(messages, openai.AssistantMessage(msg.Content))
		}
	}

	// Add current message
	messages = append(messages, openai.UserMessage(userMessage))

	req := openai.ChatCompletionNewParams{
		Model:    openai.ChatModelGPT4oMini,
		Messages: messages,
	}

	stream := a.client.Chat.Completions.NewStreaming(ctx, req)

	for stream.Next() {
		chunk := stream.Current()
		if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
			responseChan <- chunk.Choices[0].Delta.Content
		}
	}

	if err := stream.Err(); err != nil {
		return err
	}

	return nil
}

func (a *AIClient) Generate(ctx context.Context, text string, includeSummary, includeFlashcards, includeQuiz bool) (*Response, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Reset token usage when interval has passed
	if time.Since(a.lastReset) >= a.rateLimitInterval {
		a.usedTokens = 0
		a.lastReset = time.Now()
	}

	approxTokens, err := estimateTokens(text)
	if err != nil {
		fmt.Printf("[ERROR] Failed to estimate tokens: %v", err)
		return nil, errors.New("failed to estimate tokens")
	}

	// Check token limit within the current interval
	if a.tokenLimit > 0 && a.usedTokens+approxTokens > a.tokenLimit {
		return nil, fmt.Errorf("%w: used %d / %d tokens in current window", ErrRateLimitReached, a.usedTokens, a.tokenLimit)
	}

	a.usedTokens += approxTokens

	taskList := ""
	if includeSummary {
		taskList += "1. Write a short, clear summary of the text.\n"
	}
	if includeFlashcards {
		taskList += "2. Create study flashcards (Q/A pairs).\n"
	}
	if includeQuiz {
		taskList += "3. Generate multiple-choice quiz questions with 4 options each and mark the correct one.\n"
	}
	if taskList == "" {
		return &Response{
			ID: uuid.NewString(),
		}, nil
	}

	instructions := fmt.Sprintf(`Perform the following tasks on this text:
%s
If a section is not requested, leave it empty.

Text:
%s`, taskList, text)

	schemaParam := openai.ResponseFormatJSONSchemaJSONSchemaParam{
		Name:        "smartnotes_output",
		Description: openai.String("Structured AI output containing a summary, study flashcards, and multiple-choice quiz questions for student learning."),
		Schema:      ResponseSchema,
		Strict:      openai.Bool(true),
	}

	req := openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4oMini,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage("You are an educational assistant that outputs structured JSON for study materials."),
			openai.UserMessage(instructions),
		},
		ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
			OfJSONSchema: &openai.ResponseFormatJSONSchemaParam{JSONSchema: schemaParam},
		},
	}

	resp, err := a.client.Chat.Completions.New(ctx, req)
	if err != nil {
		fmt.Printf("[ERROR] OpenAI API call failed: %v\n", err)
		return nil, fmt.Errorf("AI service is currently unavailable")
	}

	var parsed models.Response
	if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &parsed); err != nil {
		fmt.Printf("[ERROR] JSON parse failed: %v\nRaw: %s\n", err, resp.Choices[0].Message.Content)
		return nil, fmt.Errorf("failed to process AI response")
	}

	if !includeSummary {
		parsed.Summary = ""
	}
	if !includeFlashcards {
		parsed.Flashcards = []models.Flashcard{}
	}
	if !includeQuiz {
		parsed.QuizQuestions = []models.QuizQuestion{}
	}

	return &Response{
		ID:            uuid.NewString(),
		Title:         parsed.Title,
		Summary:       parsed.Summary,
		Flashcards:    parsed.Flashcards,
		QuizQuestions: parsed.QuizQuestions,
	}, nil
}
