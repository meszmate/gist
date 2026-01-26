package srs

import "math"

// Rating represents the user's self-assessment of recall quality
type Rating int

const (
	Again Rating = 0 // Complete blackout, wrong response
	Hard  Rating = 1 // Correct but with serious difficulty
	Good  Rating = 2 // Correct with some hesitation
	Easy  Rating = 3 // Perfect response with no hesitation
)

// CardState represents the SRS state of a flashcard
type CardState struct {
	EaseFactor  float64 // E-Factor (easiness factor), starts at 2.5
	Interval    int     // Days until next review
	Repetitions int     // Number of consecutive correct responses
}

// DefaultCardState returns the initial state for a new card
func DefaultCardState() CardState {
	return CardState{
		EaseFactor:  2.5,
		Interval:    0,
		Repetitions: 0,
	}
}

// CalculateNextReview implements the SM-2 algorithm
// https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
func CalculateNextReview(card CardState, rating Rating) CardState {
	newState := card

	// Convert rating to quality (0-5 scale used in original SM-2)
	// We use 0-3, so we map: 0->0, 1->2, 2->3, 3->5
	var quality float64
	switch rating {
	case Again:
		quality = 0
	case Hard:
		quality = 2
	case Good:
		quality = 3
	case Easy:
		quality = 5
	}

	// Update ease factor
	// EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
	newEF := card.EaseFactor + (0.1 - (5-quality)*(0.08+(5-quality)*0.02))

	// EF should not fall below 1.3
	newState.EaseFactor = math.Max(1.3, newEF)

	if rating == Again {
		// Reset repetitions, start over
		newState.Repetitions = 0
		newState.Interval = 1 // Review again tomorrow
	} else {
		// Increment repetitions
		newState.Repetitions = card.Repetitions + 1

		// Calculate new interval
		switch newState.Repetitions {
		case 1:
			newState.Interval = 1
		case 2:
			newState.Interval = 6
		default:
			// I(n) = I(n-1) * EF
			newState.Interval = int(math.Round(float64(card.Interval) * newState.EaseFactor))
		}

		// Apply rating modifiers
		if rating == Hard {
			// Reduce interval for hard cards
			newState.Interval = int(math.Max(1, float64(newState.Interval)*0.8))
		} else if rating == Easy {
			// Bonus for easy cards
			newState.Interval = int(float64(newState.Interval) * 1.3)
		}
	}

	// Cap maximum interval at 365 days (1 year)
	if newState.Interval > 365 {
		newState.Interval = 365
	}

	return newState
}

// GetRatingLabel returns the Hungarian label for a rating
func GetRatingLabel(rating Rating) string {
	switch rating {
	case Again:
		return "Újra"
	case Hard:
		return "Nehéz"
	case Good:
		return "Jó"
	case Easy:
		return "Könnyű"
	default:
		return ""
	}
}

// GetRatingDescription returns a description for a rating
func GetRatingDescription(rating Rating) string {
	switch rating {
	case Again:
		return "Nem emlékszem, mutasd újra"
	case Hard:
		return "Emlékszem, de nehezen"
	case Good:
		return "Emlékszem, jól ment"
	case Easy:
		return "Könnyű volt, tudom"
	default:
		return ""
	}
}
