/** Whether an event belongs to a recurring series and needs scoped editing. */
export function isRecurringEvent(event) {
  return Boolean(
    event &&
    (event.recurring || event.recurrenceRule || event.isOccurrence || event.recurringEventId)
  );
}
