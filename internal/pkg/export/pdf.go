package export

import (
	"fmt"
	"io"
	"strings"

	"github.com/jung-kurt/gofpdf"
	"github.com/meszmate/smartnotes/internal/models"
)

// GeneratePDF creates a PDF study guide from material
func GeneratePDF(material *models.StudyMaterial, w io.Writer) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)

	// Add Unicode font support
	pdf.AddUTF8Font("DejaVu", "", "DejaVuSans.ttf")
	pdf.AddUTF8Font("DejaVu", "B", "DejaVuSans-Bold.ttf")

	// Title page
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 24)
	pdf.SetTextColor(55, 65, 81)

	// Title
	pdf.Cell(0, 20, "")
	pdf.Ln(30)
	pdf.MultiCell(0, 12, material.Title, "", "C", false)
	pdf.Ln(10)

	// Subtitle
	pdf.SetFont("Arial", "", 12)
	pdf.SetTextColor(107, 114, 128)
	pdf.MultiCell(0, 6, "SmartNotes Study Guide", "", "C", false)
	pdf.Ln(5)
	pdf.MultiCell(0, 6, fmt.Sprintf("Difficulty: %s", getDifficultyLabel(material.Difficulty)), "", "C", false)

	// Summary section
	if material.Summary != "" {
		pdf.AddPage()
		addSectionHeader(pdf, "Summary")
		pdf.SetFont("Arial", "", 11)
		pdf.SetTextColor(55, 65, 81)
		pdf.MultiCell(0, 6, material.Summary, "", "L", false)
	}

	// Flashcards section
	if len(material.Flashcards) > 0 {
		pdf.AddPage()
		addSectionHeader(pdf, fmt.Sprintf("Flashcards (%d)", len(material.Flashcards)))

		for i, card := range material.Flashcards {
			if pdf.GetY() > 250 {
				pdf.AddPage()
			}

			// Card number
			pdf.SetFont("Arial", "B", 10)
			pdf.SetTextColor(99, 102, 241)
			pdf.Cell(0, 8, fmt.Sprintf("Card %d", i+1))
			pdf.Ln(8)

			// Question
			pdf.SetFont("Arial", "B", 11)
			pdf.SetTextColor(55, 65, 81)
			pdf.Cell(20, 6, "Q:")
			pdf.SetFont("Arial", "", 11)
			pdf.MultiCell(0, 6, card.Question, "", "L", false)
			pdf.Ln(2)

			// Answer
			pdf.SetFont("Arial", "B", 11)
			pdf.Cell(20, 6, "A:")
			pdf.SetFont("Arial", "", 11)
			pdf.SetTextColor(22, 163, 74)
			pdf.MultiCell(0, 6, card.Answer, "", "L", false)
			pdf.SetTextColor(55, 65, 81)

			// Separator
			pdf.Ln(5)
			pdf.SetDrawColor(229, 231, 235)
			pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
			pdf.Ln(5)
		}
	}

	// Quiz section
	if len(material.QuizQuestions) > 0 {
		pdf.AddPage()
		addSectionHeader(pdf, fmt.Sprintf("Quiz Questions (%d)", len(material.QuizQuestions)))

		for i, q := range material.QuizQuestions {
			if pdf.GetY() > 230 {
				pdf.AddPage()
			}

			// Question number and text
			pdf.SetFont("Arial", "B", 11)
			pdf.SetTextColor(55, 65, 81)
			pdf.MultiCell(0, 6, fmt.Sprintf("%d. %s", i+1, q.Question), "", "L", false)
			pdf.Ln(3)

			// Options
			pdf.SetFont("Arial", "", 10)
			for j, opt := range q.Options {
				prefix := string(rune('A' + j))
				isCorrect := opt == q.Correct

				if isCorrect {
					pdf.SetTextColor(22, 163, 74)
					pdf.Cell(10, 6, "")
					pdf.MultiCell(0, 6, fmt.Sprintf("%s) %s (Correct)", prefix, opt), "", "L", false)
				} else {
					pdf.SetTextColor(107, 114, 128)
					pdf.Cell(10, 6, "")
					pdf.MultiCell(0, 6, fmt.Sprintf("%s) %s", prefix, opt), "", "L", false)
				}
			}

			pdf.SetTextColor(55, 65, 81)
			pdf.Ln(8)
		}
	}

	// Footer
	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(156, 163, 175)

	return pdf.Output(w)
}

func addSectionHeader(pdf *gofpdf.Fpdf, title string) {
	pdf.SetFont("Arial", "B", 16)
	pdf.SetTextColor(99, 102, 241)
	pdf.Cell(0, 12, title)
	pdf.Ln(15)

	// Underline
	pdf.SetDrawColor(99, 102, 241)
	pdf.SetLineWidth(0.5)
	pdf.Line(15, pdf.GetY()-3, 60, pdf.GetY()-3)
	pdf.Ln(5)
}

func getDifficultyLabel(d models.Difficulty) string {
	switch d {
	case models.DifficultyBeginner:
		return "Beginner"
	case models.DifficultyAdvanced:
		return "Advanced"
	default:
		return "Standard"
	}
}

// GenerateTextExport creates a simple text export
func GenerateTextExport(material *models.StudyMaterial) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("# %s\n\n", material.Title))

	if material.Summary != "" {
		sb.WriteString("## Summary\n\n")
		sb.WriteString(material.Summary)
		sb.WriteString("\n\n")
	}

	if len(material.Flashcards) > 0 {
		sb.WriteString("## Flashcards\n\n")
		for i, card := range material.Flashcards {
			sb.WriteString(fmt.Sprintf("### Card %d\n", i+1))
			sb.WriteString(fmt.Sprintf("**Q:** %s\n", card.Question))
			sb.WriteString(fmt.Sprintf("**A:** %s\n\n", card.Answer))
		}
	}

	if len(material.QuizQuestions) > 0 {
		sb.WriteString("## Quiz Questions\n\n")
		for i, q := range material.QuizQuestions {
			sb.WriteString(fmt.Sprintf("### Question %d\n", i+1))
			sb.WriteString(fmt.Sprintf("%s\n\n", q.Question))
			for j, opt := range q.Options {
				prefix := string(rune('A' + j))
				if opt == q.Correct {
					sb.WriteString(fmt.Sprintf("%s) %s ✓\n", prefix, opt))
				} else {
					sb.WriteString(fmt.Sprintf("%s) %s\n", prefix, opt))
				}
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}
