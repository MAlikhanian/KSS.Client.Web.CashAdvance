// Optional comment on an APPROVE decision, per invoice approval stage (single and bulk).
// A rejection always carries its required reason, whatever this list says.
// A stage takes the comment when it is in this list; removing it switches the comment off there.
export const APPROVAL_COMMENT_STAGES: ReadonlyArray<'fm' | 'ceo'> = ['ceo', 'fm'];

// Status id of "approved" (the same value the workflow gates compare against).
export const STATUS_APPROVED = 2;

export const approvalCommentAt = (stage: 'fm' | 'ceo') => APPROVAL_COMMENT_STAGES.includes(stage);
