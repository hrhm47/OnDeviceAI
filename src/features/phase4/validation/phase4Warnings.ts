export type Phase4ValidationWarning = {
  fieldId: string;
  code: string;
  message: string;
};

export const warning = (
  fieldId: string,
  code: string,
  message: string,
): Phase4ValidationWarning => ({ fieldId, code, message });
