// Copy for the WhatsApp conversation. English first; the shape is ready for a
// Twi catalogue (ONB-04). No emoji, short sentences, one idea per message.

export const copy = {
  welcome: () =>
    'Hi! Welcome to sikatree. I will set up your shop right here in WhatsApp, in about 5 minutes.',

  consent: () =>
    'First, the legal bit. By continuing you agree to our terms and privacy notice: sikatree.africa/terms. Message me on WhatsApp about my shop.',

  askName: () => 'What is your business called?',

  askType: () => 'Nice name. What do you do?',

  askHandle: (suggestions: string[]) =>
    `Your page link can look like one of these. Pick one, or type your own.\n\n${suggestions
      .map((handle) => `sikatree.africa/${handle}`)
      .join('\n')}`,

  handleTaken: (suggestion: string) =>
    `That link is taken. sikatree.africa/${suggestion} is free. Want it?`,

  handleReserved: () => 'That link is reserved. Try another one.',

  handleChosen: (handle: string) =>
    `sikatree.africa/${handle} is yours.\n\nNow add your first item. Send it like this:\nVitamin C serum 120`,

  askFirstItem: () =>
    'Now add your first item. Send it like this:\nVitamin C serum 120\n\nOr tap Skip to go live with an empty shop.',

  itemPreview: (lines: string) =>
    `Here is what I understood:\n\n${lines}\n\nDoes this look right?`,

  itemInvalid: () =>
    'I could not find a price in that. Send the name and price together, like:\nVitamin C serum 120',

  itemAdded: (name: string) => `Added ${name}.`,

  live: (handle: string, domain: string) =>
    `You are live: ${domain}/${handle}\n\nSend this to your customers:\n"Shop with me on sikatree: ${domain}/${handle}"`,

  setupInProgress: () =>
    'You are still setting up. Reply RESTART to start over, or continue with the last question.',

  menu: () =>
    'What would you like to do?\n\n1. Share my page\n2. Add an item\n3. My orders\n4. Help\n\nReply with a number or the word.',

  help: () =>
    'A human will pick this up. In the meantime, reply menu to see what I can do.',

  stopped: () => 'You will not hear from me again. Reply START to come back.',

  terms: () =>
    'Terms: sikatree.africa/terms\nPrivacy: sikatree.africa/privacy\n\nMessage me on WhatsApp about my shop.',

  nameInvalid: () => 'Send your business name, 2 to 60 characters.',

  handleInvalid: () => 'Links use letters, numbers and dashes, 3 to 24 characters. Try another.',

  handleCustom: () => 'Type the link you want. Letters, numbers and dashes, 3 to 24 characters.',

  orders: () => 'Orders will show up here once customers start buying.',

  addPrompt: () =>
    'Send the item and price, like:\nBeaded bag 180\n\nReply MENU when you are done.',

  cancelled: () => 'No changes made. Reply MENU to see the options.',

  fallback: () =>
    'I did not get that. Send a photo with the item name and price, or reply menu to see the options.',

  unsupported: () =>
    'I can only read text and photos for now. Send the item name and price as text, or reply menu.',

  slowDown: () => 'One moment. Send your next message in a minute.',
};
