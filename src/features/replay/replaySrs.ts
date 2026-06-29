/** How replay training should update SRS for a given half move. */
export type ReplaySrsMode = 'enroll' | 'grade';

export const replaySrsModeFromSeenBefore = (
  seenBefore: boolean,
): ReplaySrsMode => (seenBefore ? 'grade' : 'enroll');
