exports.handler = async function(event, context) {
  // Só aceita POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Access token não configurado' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido' }) };
  }

  const { nome, email, tipo } = body;
  const valor = tipo === 'credito' ? 15.00 : 10.00;
  const descricao = tipo === 'credito' ? 'Currículo Profissional — Cartão' : 'Currículo Profissional — Pix';

  const preferencia = {
    items: [{
      title: 'Currículo Profissional',
      description: descricao,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: valor
    }],
    payer: {
      name: nome || '',
      email: email || 'cliente@email.com'
    },
    payment_methods: {
      excluded_payment_types: tipo === 'pix'
        ? [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }]
        : [{ id: 'ticket' }],
      installments: tipo === 'credito' ? 1 : undefined
    },
    back_urls: {
      success: process.env.URL + '/sucesso.html',
      failure: process.env.URL + '/#pagar',
      pending: process.env.URL + '/#pagar'
    },
    auto_return: 'approved',
    statement_descriptor: 'CURRICULO PRO',
    external_reference: `curriculo_${Date.now()}`
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferencia)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro MP:', data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.message || 'Erro ao criar pagamento' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        id: data.id,
        init_point: data.init_point,       // URL de pagamento produção
        sandbox_init_point: data.sandbox_init_point  // URL de teste
      })
    };
  } catch(err) {
    console.error('Erro função:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

