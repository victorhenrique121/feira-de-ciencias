/*
  Banco de perguntas do quiz.
  O app.js sorteia uma parte delas a cada partida.
  Para adicionar perguntas, copie o mesmo formato.
*/
const PERGUNTAS = [
  {
    pergunta: "Uma instalação custa R$ 9.000 e economiza R$ 300 por mês. Qual é o payback simples?",
    opcoes: ["15 meses", "20 meses", "30 meses", "36 meses"],
    correta: 2,
    explicacao: "Payback = investimento ÷ economia mensal. 9.000 ÷ 300 = 30 meses."
  },
  {
    pergunta: "Qual característica torna a energia solar uma fonte renovável?",
    opcoes: ["Usa carvão", "Depende de um recurso que se renova naturalmente", "Precisa de petróleo", "Só funciona com gás"],
    correta: 1,
    explicacao: "A radiação solar é uma fonte natural que se renova continuamente em escala humana."
  },
  {
    pergunta: "Uma economia de R$ 280 por mês representa quanto em um ano?",
    opcoes: ["R$ 2.800", "R$ 3.120", "R$ 3.360", "R$ 3.800"],
    correta: 2,
    explicacao: "Multiplicamos a economia mensal por 12: 280 × 12 = R$ 3.360."
  },
  {
    pergunta: "Se um investimento de R$ 7.200 gera economia de R$ 300 por mês, em quantos anos ocorre o payback?",
    opcoes: ["1 ano", "2 anos", "3 anos", "4 anos"],
    correta: 1,
    explicacao: "7.200 ÷ 300 = 24 meses, que correspondem a 2 anos."
  },
  {
    pergunta: "Qual equipamento transforma a energia elétrica gerada pelo painel para uso na instalação em corrente alternada?",
    opcoes: ["Inversor", "Interruptor", "Disjuntor", "Medidor de temperatura"],
    correta: 0,
    explicacao: "O inversor realiza a conversão necessária para que a energia possa ser utilizada pelos equipamentos da instalação."
  },
  {
    pergunta: "Se a economia mensal aumenta e o investimento permanece igual, o payback tende a:",
    opcoes: ["Aumentar", "Diminuir", "Ficar sempre igual", "Ser impossível de calcular"],
    correta: 1,
    explicacao: "Com uma economia mensal maior, o valor investido é recuperado em menos meses."
  },
  {
    pergunta: "Qual situação representa melhor sustentabilidade?",
    opcoes: ["Economizar dinheiro sem considerar impactos", "Produzir energia usando uma fonte renovável e analisar seus impactos", "Usar qualquer tecnologia sem medir resultados", "Consumir mais porque a energia é renovável"],
    correta: 1,
    explicacao: "Sustentabilidade envolve considerar aspectos ambientais, econômicos e sociais, e não apenas um deles."
  },
  {
    pergunta: "Uma casa paga R$ 500 por mês e consegue economizar 80%. Qual seria a economia mensal estimada?",
    opcoes: ["R$ 100", "R$ 250", "R$ 400", "R$ 480"],
    correta: 2,
    explicacao: "80% de R$ 500 = R$ 400."
  },
  {
    pergunta: "Se um projeto custa R$ 10.000 e economiza R$ 250 por mês, aproximadamente quanto tempo é necessário para recuperar o investimento?",
    opcoes: ["20 meses", "30 meses", "40 meses", "50 meses"],
    correta: 2,
    explicacao: "10.000 ÷ 250 = 40 meses."
  },
  {
    pergunta: "Qual é uma vantagem de gerar energia próxima do local de consumo?",
    opcoes: ["Aumentar obrigatoriamente o consumo", "Possibilitar geração distribuída", "Eliminar toda manutenção", "Dispensar qualquer equipamento elétrico"],
    correta: 1,
    explicacao: "A geração distribuída permite que a energia seja produzida próxima aos locais onde é consumida."
  },
  {
    pergunta: "Se um sistema tem payback de 30 meses, isso corresponde aproximadamente a:",
    opcoes: ["1,5 ano", "2 anos", "2,5 anos", "4 anos"],
    correta: 2,
    explicacao: "30 ÷ 12 = 2,5 anos."
  },
  {
    pergunta: "Por que o payback simples é útil em uma feira de ciências?",
    opcoes: ["Porque prevê exatamente o futuro", "Porque transforma investimento e economia em um prazo fácil de interpretar", "Porque elimina todos os custos reais", "Porque substitui qualquer análise financeira"],
    correta: 1,
    explicacao: "É uma forma didática e simples de visualizar quanto tempo levaria para recuperar um investimento."
  },
  {
    pergunta: "Uma economia anual de R$ 4.200 durante 5 anos representa qual economia acumulada, sem considerar outros fatores?",
    opcoes: ["R$ 8.400", "R$ 12.600", "R$ 18.000", "R$ 21.000"],
    correta: 3,
    explicacao: "4.200 × 5 = R$ 21.000."
  },
  {
    pergunta: "Qual fator pode alterar a economia real de um sistema solar?",
    opcoes: ["Tarifa de energia", "Condições de geração", "Consumo da residência", "Todos os anteriores"],
    correta: 3,
    explicacao: "A economia real depende de vários fatores, incluindo tarifa, consumo, dimensionamento e condições de geração."
  },
  {
    pergunta: "Se o investimento é R$ 6.000 e a economia mensal é R$ 500, o payback é:",
    opcoes: ["6 meses", "10 meses", "12 meses", "18 meses"],
    correta: 2,
    explicacao: "6.000 ÷ 500 = 12 meses."
  },
  {
    pergunta: "O que significa dizer que uma fonte é renovável?",
    opcoes: ["Que nunca tem qualquer impacto", "Que seu recurso energético se repõe naturalmente", "Que não precisa de tecnologia", "Que é sempre gratuita"],
    correta: 1,
    explicacao: "Renovável significa que a fonte se repõe naturalmente em uma escala compatível com seu uso."
  }
];
