(function(root){
  'use strict';
  const units={C:{name:'Цельсий',symbol:'°C',min:-273.15},F:{name:'Фаренгейт',symbol:'°F',min:-459.67},K:{name:'Кельвин',symbol:'K',min:0},R:{name:'Ранкин',symbol:'°R',min:0}};
  function parse(text){const normalized=String(text).trim().replace(/\u2212/g,'-').replace(',','.');if(!normalized)throw Error('Введите температуру.');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized))throw Error('Введите число, например 36,6 или −40.');const value=Number(normalized);if(!Number.isFinite(value))throw Error('Число слишком большое.');return value;}
  function convert(value,from,to){if(!units[from]||!units[to])throw Error('Неизвестная единица температуры.');if(!Number.isFinite(value))throw Error('Введите конечное число.');if(value<units[from].min)throw Error('Ниже абсолютного нуля: минимум '+String(units[from].min).replace('.',',')+' '+units[from].symbol+'.');if(from===to)return value;const k=from==='C'?value+273.15:from==='F'?(value+459.67)*5/9:from==='R'?value*5/9:value;const result=to==='K'?k:to==='C'?k-273.15:to==='F'?k*9/5-459.67:k*9/5;if(!Number.isFinite(result))throw Error('Результат слишком велик для вычисления.');return Object.is(result,-0)?0:result;}
  const api={units,parse,convert};if(typeof module==='object'&&module.exports)module.exports=api;else root.Temperature=api;
})(typeof globalThis!=='undefined'?globalThis:this);
