export type LessonStreamEvent =
  | { type: "title"; value: string }
  | { type: "description"; value: string }
  | { type: "step"; index: number; step: Record<string, unknown> };

function extractStringField(buf: string, key: string): string | null {
  const kpat = `"${key}"`;
  const idx = buf.indexOf(kpat);
  if (idx === -1) return null;

  let i = idx + kpat.length;
  while (i < buf.length && /\s/.test(buf[i])) i++;
  if (buf[i] !== ":") return null;
  i++;
  while (i < buf.length && /\s/.test(buf[i])) i++;
  if (buf[i] !== '"') return null;

  i++;
  let out = "";
  let escape = false;
  while (i < buf.length) {
    const c = buf[i];
    if (escape) {
      switch (c) {
        case "n": out += "\n"; break;
        case "t": out += "\t"; break;
        case "r": out += "\r"; break;
        case '"': out += '"'; break;
        case "\\": out += "\\"; break;
        case "/": out += "/"; break;
        case "u": {
          if (i + 4 >= buf.length) return null;
          const hex = buf.slice(i + 1, i + 5);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) { out += c; break; }
          out += String.fromCharCode(parseInt(hex, 16));
          i += 4;
          break;
        }
        default: out += c;
      }
      escape = false;
    } else if (c === "\\") {
      escape = true;
    } else if (c === '"') {
      return out;
    } else {
      out += c;
    }
    i++;
  }
  return null;
}

function findStepsArrayOpen(buf: string): number | null {
  const key = `"steps"`;
  const idx = buf.indexOf(key);
  if (idx === -1) return null;
  let i = idx + key.length;
  while (i < buf.length && /\s/.test(buf[i])) i++;
  if (buf[i] !== ":") return null;
  i++;
  while (i < buf.length && /\s/.test(buf[i])) i++;
  if (buf[i] !== "[") return null;
  return i + 1;
}

export class LessonStreamParser {
  private buffer = "";
  private cursor = 0;
  private titleEmitted = false;
  private descriptionEmitted = false;
  private stepsArrayStart: number | null = null;
  private braceDepth = 0;
  private inString = false;
  private escape = false;
  private currentStepStart: number | null = null;
  private stepIndex = 0;
  private doneScanningSteps = false;

  feed(chunk: string): LessonStreamEvent[] {
    this.buffer += chunk;
    const events: LessonStreamEvent[] = [];

    if (this.stepsArrayStart === null) {
      if (!this.titleEmitted) {
        const t = extractStringField(this.buffer, "title");
        if (t !== null) {
          events.push({ type: "title", value: t });
          this.titleEmitted = true;
        }
      }
      if (!this.descriptionEmitted) {
        const d = extractStringField(this.buffer, "description");
        if (d !== null) {
          events.push({ type: "description", value: d });
          this.descriptionEmitted = true;
        }
      }

      const start = findStepsArrayOpen(this.buffer);
      if (start !== null) {
        this.stepsArrayStart = start;
        this.cursor = start;
      }
    }

    if (this.stepsArrayStart !== null && !this.doneScanningSteps) {
      while (this.cursor < this.buffer.length) {
        const ch = this.buffer[this.cursor];

        if (this.inString) {
          if (this.escape) {
            this.escape = false;
          } else if (ch === "\\") {
            this.escape = true;
          } else if (ch === '"') {
            this.inString = false;
          }
        } else {
          if (ch === '"') {
            this.inString = true;
          } else if (ch === "{") {
            if (this.braceDepth === 0) {
              this.currentStepStart = this.cursor;
            }
            this.braceDepth++;
          } else if (ch === "}") {
            this.braceDepth--;
            if (this.braceDepth === 0 && this.currentStepStart !== null) {
              const stepJson = this.buffer.slice(this.currentStepStart, this.cursor + 1);
              try {
                const parsed = JSON.parse(stepJson) as Record<string, unknown>;
                events.push({ type: "step", index: this.stepIndex, step: parsed });
                this.stepIndex++;
              } catch {
                // skip malformed
              }
              this.currentStepStart = null;
            }
          } else if (ch === "]" && this.braceDepth === 0) {
            this.doneScanningSteps = true;
            this.cursor++;
            break;
          }
        }
        this.cursor++;
      }
    }

    return events;
  }

  getBuffer(): string {
    return this.buffer;
  }
}
