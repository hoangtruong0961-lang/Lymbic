async function test() {
  const cases = [
    'https://api.deepseek.com/chat/completions',
    'https://api.deepseek.com/v1/chat/completions'
  ];
  for (const url of cases) {
    console.log("Testing", url);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-7e0a5df71a2540509a3ddcdca051757f'
      },
      body: JSON.stringify({model:"deepseek-chat",messages:[{role:"user",content:"test"}],max_tokens:10})
    });
    console.log(url, res.status, await res.text());
  }
}
test();
