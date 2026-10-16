export function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)),
  );
}

export function toLink(link) {
  return compact({ label: link.label, url: link.url, note: link.note });
}
