// Calls a Supabase edge function and turns any failure into a clear message.
// Supabase's own message ("Edge Function returned a non-2xx status code") hides the real reason.

const FRIENDLY = {
  400: 'Something in the request was not right. Please check what you entered and try again.',
  401: 'Please log in again. Your session has ended.',
  403: 'You are not allowed to do this.',
  404: 'This feature is not switched on yet on the server.',
  409: 'This is already being done. Please wait a moment.',
  413: 'That is too big to send. Please try something smaller.',
  429: 'Too many requests right now. Please wait a minute and try again.',
  500: 'The server hit a problem. Please try again.',
  502: 'An AI or job service did not answer. Please try again.',
  503: 'The server is busy. Please try again in a minute.',
  504: 'This took too long. Please try again.',
  546: 'This took too long or used too much memory on the server. Please try again.',
};

async function readBody(res) {
  try {
    const copy = typeof res.clone === 'function' ? res.clone() : res;
    const raw = await copy.text();
    try { return { json: JSON.parse(raw), raw }; } catch { return { json: null, raw }; }
  } catch {
    return { json: null, raw: '' };
  }
}

export function makeInvoke(supabase, { dev = false } = {}) {
  const call = async (name, body, retried) => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (!error) {
      if (data?.error) throw Object.assign(new Error(data.error), { fn: name });
      return data;
    }

    if (error.name === 'FunctionsFetchError') {
      throw Object.assign(new Error('No internet connection. Check your data or Wi-Fi and try again.'), { fn: name });
    }
    if (error.name === 'FunctionsRelayError') {
      throw Object.assign(new Error('Could not reach the server. Please try again.'), { fn: name });
    }

    const res = error.context;
    const status = res?.status;
    const { json, raw } = res ? await readBody(res) : { json: null, raw: '' };

    // Expired login: refresh it and try once more
    if (status === 401 && !retried) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.session) return call(name, body, true);
    }

    let message = json?.error || json?.message || json?.msg;
    if (!message && status === 404 && /not found/i.test(raw)) message = `The server function "${name}" is missing. Deploy the functions.`;
    if (!message && (status === 546 || json?.code === 'WORKER_LIMIT')) message = FRIENDLY[546];
    message = message || FRIENDLY[status] || 'Something went wrong. Please try again.';

    console.warn(`[${name}] failed with status ${status ?? 'unknown'}:`, raw ? raw.slice(0, 300) : error.message);
    // While testing (Expo Go), show which function failed and the status code
    const shown = dev ? `${message} (${name}, status ${status ?? 'unknown'})` : message;
    throw Object.assign(new Error(shown), { status, fn: name });
  };
  return (name, body) => call(name, body, false);
}
