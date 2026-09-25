/** Read a trimmed text value from a named form control. */
export function field(form: HTMLFormElement, name: string): string {
  const control = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
  return control ? control.value.trim() : ''
}

export function checked(form: HTMLFormElement, name: string): boolean {
  const control = form.elements.namedItem(name) as HTMLInputElement | null
  return Boolean(control?.checked)
}
