/** A meal added to a specific day in the multi-day plan. */
export interface PlanLine {
  /** Unique line id (item + add-on combo + nonce). */
  uid: string;
  itemId: string;
  name: string;
  /** Unit price including any add-on up-charges. */
  price: number;
  image?: string;
  /** Human-readable add-on summary, e.g. "Mac & cheese · Hot sauce". */
  addOnLabel?: string;
}

/** Lines keyed by ISO delivery date. */
export type DaySelections = Record<string, PlanLine[]>;

export type PlanStep = "calendar" | "menu" | "review" | "checkout" | "done";
