exports.handler = async function (event) {
  try {
    const GAS_URL =
      "https://script.google.com/macros/s/AKfycbz3ISHG89MDBikKWOJvvz1-0GK9MC0vPopT-1HjBbdQgvHzSBxHbTvyWUPxEE_qjtk/exec";

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: event.body,
      redirect: "follow",
    });

    const text = await r.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: String((e && e.message) || e) }),
    };
  }
};
