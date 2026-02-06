import { StyleSheet } from "@react-pdf/renderer";

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  description: {
    fontSize: 11,
    color: "#666",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: "#333",
  },
  infoLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    borderBottomStyle: "solid",
    width: 180,
    marginLeft: 8,
  },
  instructions: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 10,
    color: "#555",
  },
  questionContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    borderBottomStyle: "solid",
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    marginRight: 8,
  },
  questionText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 1.5,
  },
  pointsBadge: {
    fontSize: 9,
    color: "#666",
    backgroundColor: "#f0f0f0",
    padding: "2 6",
    borderRadius: 3,
  },
  // Multiple choice styles
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    marginLeft: 16,
  },
  optionCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#333",
    marginRight: 8,
    marginTop: 1,
  },
  optionLetter: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginRight: 6,
    width: 14,
  },
  optionText: {
    fontSize: 11,
    flex: 1,
  },
  // Checkbox styles (for multi-select)
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: "#333",
    marginRight: 8,
    marginTop: 1,
  },
  // True/False styles
  trueFalseRow: {
    flexDirection: "row",
    marginLeft: 16,
    gap: 24,
  },
  trueFalseOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Text input styles
  answerLines: {
    marginTop: 8,
    marginLeft: 16,
  },
  answerLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    borderBottomStyle: "solid",
    marginBottom: 16,
    height: 20,
  },
  // Year/Numeric input styles
  shortAnswerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginLeft: 16,
  },
  shortAnswerLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    borderBottomStyle: "solid",
    width: 100,
    marginRight: 8,
  },
  unitLabel: {
    fontSize: 10,
    color: "#666",
  },
  // Matching styles
  matchingContainer: {
    marginTop: 8,
    marginLeft: 16,
  },
  matchingHeaders: {
    flexDirection: "row",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    borderBottomStyle: "solid",
  },
  matchingHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#555",
    flex: 1,
  },
  matchingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  matchingLeft: {
    fontSize: 10,
    flex: 1,
  },
  matchingBlank: {
    width: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    borderBottomStyle: "solid",
    textAlign: "center",
    marginRight: 8,
  },
  matchingRight: {
    fontSize: 10,
    flex: 1,
  },
  matchingAnswerKey: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  matchingKeyItem: {
    fontSize: 9,
    backgroundColor: "#f0f0f0",
    padding: "2 6",
    borderRadius: 2,
  },
  // Fill in the blank styles
  fillBlankText: {
    fontSize: 11,
    lineHeight: 2,
    marginLeft: 16,
    marginTop: 8,
  },
  blankUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    borderBottomStyle: "solid",
    minWidth: 60,
    display: "flex",
  },
  // Answer key styles
  answerKeyPage: {
    padding: 40,
    fontFamily: "Helvetica",
  },
  answerKeyTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 20,
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    borderBottomStyle: "solid",
    paddingBottom: 10,
  },
  answerKeyItem: {
    flexDirection: "row",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    borderBottomStyle: "solid",
  },
  answerKeyNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    width: 30,
  },
  answerKeyContent: {
    flex: 1,
  },
  answerKeyAnswer: {
    fontSize: 11,
    marginBottom: 2,
  },
  answerKeyExplanation: {
    fontSize: 9,
    color: "#666",
    fontStyle: "italic",
  },
  pageNumber: {
    position: "absolute",
    fontSize: 10,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#999",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
});

export type PaperSize = "letter" | "a4";

export const paperSizes: Record<PaperSize, { width: number; height: number }> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595, height: 842 },
};
