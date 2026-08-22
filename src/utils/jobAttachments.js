export const MAX_JOB_ATTACHMENTS = 4;

export const getJobAttachments = (card) => {
  if (Array.isArray(card?.jobAttachments) && card.jobAttachments.length) {
    return card.jobAttachments.filter((item) => item?.dataUrl).slice(0, MAX_JOB_ATTACHMENTS);
  }
  if (card?.jobAttachment?.dataUrl) {
    return [card.jobAttachment];
  }
  return [];
};

export const readFileAsAttachment = (file) => new Promise((resolve, reject) => {
  const allowedTypes = ['application/pdf'];
  const isAllowed = allowedTypes.includes(file.type) || file.type.startsWith('image/');
  if (!isAllowed) {
    reject(new Error('Only PDF and image files are allowed.'));
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    reject(new Error('Each file must be 2MB or less.'));
    return;
  }

  const reader = new FileReader();
  reader.onload = () => resolve({
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl: reader.result,
  });
  reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
  reader.readAsDataURL(file);
});
