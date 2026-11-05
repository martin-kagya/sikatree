export type ReplyButton = {
  id: string;
  title: string; // WhatsApp allows 20 characters
};

export type Outbound =
  | { kind: 'text'; body: string }
  | { kind: 'buttons'; body: string; buttons: ReplyButton[] };

export function text(body: string): Outbound {
  return { kind: 'text', body };
}

export function buttons(body: string, options: ReplyButton[]): Outbound {
  if (options.length < 1 || options.length > 3) {
    throw new Error('WhatsApp allows 1 to 3 reply buttons');
  }
  return {
    kind: 'buttons',
    body,
    buttons: options.map((button) => ({ ...button, title: button.title.slice(0, 20) })),
  };
}
