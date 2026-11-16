(function () {
  'use strict';

  var DIFFICULTIES = {
    small:  { gridSize: 9,  maxWords: 12, targetWords: 9  },
    medium: { gridSize: 11, maxWords: 18, targetWords: 14 },
    large:  { gridSize: 13, maxWords: 24, targetWords: 20 }
  };

  var LAT_TO_CYR = {
    'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н', 'K': 'К', 'M': 'М',
    'O': 'О', 'P': 'Р', 'T': 'Т', 'X': 'Х'
  };

  var state = {
    currentDirection: 'across',
    cells: {},
    crossword: null
  };

  // --- Детерминированный ГПСЧ ---
  function makeRng(seed) {
    var s = seed | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // --- Генератор ---
  function makeEmptyGrid(size) {
    var g = [];
    for (var i = 0; i < size; i++) g.push(new Array(size).fill(null));
    return g;
  }

  function checkPlace(grid, size, word, x, y, dx, dy) {
    var L = word.length;
    var ex = x + dx * (L - 1);
    var ey = y + dy * (L - 1);
    if (x < 0 || y < 0 || ex >= size || ey >= size) return -1;

    var bx = x - dx, by = y - dy;
    if (bx >= 0 && by >= 0 && bx < size && by < size && grid[by][bx] !== null) return -1;

    var ax = ex + dx, ay = ey + dy;
    if (ax >= 0 && ay >= 0 && ax < size && ay < size && grid[ay][ax] !== null) return -1;

    var crossings = 0;
    for (var i = 0; i < L; i++) {
      var cx = x + dx * i;
      var cy = y + dy * i;
      var cell = grid[cy][cx];
      if (cell !== null) {
        if (cell !== word.charAt(i)) return -1;
        crossings++;
      } else {
        if (dx !== 0) {
          if (cy > 0 && grid[cy - 1][cx] !== null) return -1;
          if (cy < size - 1 && grid[cy + 1][cx] !== null) return -1;
        } else {
          if (cx > 0 && grid[cy][cx - 1] !== null) return -1;
          if (cx < size - 1 && grid[cy][cx + 1] !== null) return -1;
        }
      }
    }
    return crossings;
  }

  function writeWord(grid, word, x, y, dx, dy) {
    for (var i = 0; i < word.length; i++) {
      grid[y + dy * i][x + dx * i] = word.charAt(i);
    }
  }

  function tryGenerate(allWords, difficulty, rng) {
    var size = difficulty.gridSize;
    var maxWords = difficulty.maxWords;

    var filtered = [];
    for (var fi = 0; fi < allWords.length; fi++) {
      if (allWords[fi].word.length <= size) filtered.push(allWords[fi]);
    }
    var shuffled = shuffle(filtered.slice(), rng);
    var candidates = shuffled.slice(0, Math.min(shuffled.length, maxWords * 3));
    candidates.sort(function (a, b) { return b.word.length - a.word.length; });

    if (candidates.length === 0) {
      return { grid: [], placed: [], width: 0, height: 0 };
    }

    var grid = makeEmptyGrid(size);
    var placed = [];

    var first = candidates[0];
    var sx = Math.floor((size - first.word.length) / 2);
    var sy = Math.floor(size / 2);
    writeWord(grid, first.word, sx, sy, 1, 0);
    placed.push({ data: first, x: sx, y: sy, dx: 1, dy: 0 });

    var remaining = candidates.slice(1);

    while (placed.length < maxWords && remaining.length > 0) {
      var best = null;
      for (var w = 0; w < remaining.length; w++) {
        var data = remaining[w];
        var len = data.word.length;
        for (var yy = 0; yy < size; yy++) {
          for (var xx = 0; xx < size; xx++) {
            var c1 = checkPlace(grid, size, data.word, xx, yy, 1, 0);
            if (c1 > 0) {
              var sc1 = c1 * 10 - Math.abs(xx + len / 2 - size / 2) - Math.abs(yy - size / 2);
              if (!best || sc1 > best.score) {
                best = { data: data, x: xx, y: yy, dx: 1, dy: 0, score: sc1, idx: w };
              }
            }
            var c2 = checkPlace(grid, size, data.word, xx, yy, 0, 1);
            if (c2 > 0) {
              var sc2 = c2 * 10 - Math.abs(xx - size / 2) - Math.abs(yy + len / 2 - size / 2);
              if (!best || sc2 > best.score) {
                best = { data: data, x: xx, y: yy, dx: 0, dy: 1, score: sc2, idx: w };
              }
            }
          }
        }
      }
      if (!best) break;
      writeWord(grid, best.data.word, best.x, best.y, best.dx, best.dy);
      placed.push({ data: best.data, x: best.x, y: best.y, dx: best.dx, dy: best.dy });
      remaining.splice(best.idx, 1);
    }

    var minX = size, minY = size, maxX = -1, maxY = -1;
    for (var p = 0; p < placed.length; p++) {
      var pl = placed[p];
      var Lw = pl.data.word.length;
      var ex2 = pl.x + pl.dx * (Lw - 1);
      var ey2 = pl.y + pl.dy * (Lw - 1);
      if (pl.x < minX) minX = pl.x;
      if (pl.y < minY) minY = pl.y;
      if (ex2 > maxX) maxX = ex2;
      if (ey2 > maxY) maxY = ey2;
    }
    if (maxX < 0) return { grid: [], placed: [], width: 0, height: 0 };

    var W = maxX - minX + 1;
    var H = maxY - minY + 1;

    var shifted = placed.map(function (pl) {
      return { data: pl.data, x: pl.x - minX, y: pl.y - minY, dx: pl.dx, dy: pl.dy };
    });

    var finalGrid = [];
    for (var fy = 0; fy < H; fy++) finalGrid.push(new Array(W).fill(null));
    for (var k = 0; k < shifted.length; k++) {
      var sp = shifted[k];
      for (var ii = 0; ii < sp.data.word.length; ii++) {
        finalGrid[sp.y + sp.dy * ii][sp.x + sp.dx * ii] = sp.data.word.charAt(ii);
      }
    }

    return { grid: finalGrid, placed: shifted, width: W, height: H };
  }

  function generateCrossword(difficulty, baseSeed) {
    var best = null;
    var startTime = Date.now();
    for (var attempt = 0; attempt < 25; attempt++) {
      if (Date.now() - startTime > 2000) break;
      var rng = makeRng(baseSeed + attempt * 7919);
      var result = tryGenerate(CROSSWORD_WORDS, difficulty, rng);
      if (!result || result.placed.length === 0) continue;
      if (!best) { best = result; }
      else if (result.placed.length > best.placed.length) { best = result; }
      else if (result.placed.length === best.placed.length) {
        var r1 = Math.max(result.width, result.height) / Math.max(1, Math.min(result.width, result.height));
        var r2 = Math.max(best.width, best.height) / Math.max(1, Math.min(best.width, best.height));
        if (r1 < r2) best = result;
      }
      if (best.placed.length >= difficulty.targetWords) break;
    }
    return best;
  }

  // --- Нумерация клеток ---
  function computeNumbers(grid) {
    var H = grid.length;
    if (H === 0) return {};
    var W = grid[0].length;
    var numbers = {};
    var n = 0;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        if (!grid[y][x]) continue;
        var startsAcross = (x === 0 || !grid[y][x - 1]) && x + 1 < W && !!grid[y][x + 1];
        var startsDown = (y === 0 || !grid[y - 1][x]) && y + 1 < H && !!grid[y + 1][x];
        if (startsAcross || startsDown) {
          n++;
          numbers[y + ',' + x] = n;
        }
      }
    }
    return numbers;
  }

  // --- Рендер ---
  function renderClues(containerId, clues) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';
    for (var i = 0; i < clues.length; i++) {
      var li = document.createElement('li');
      li.value = clues[i].number;
      li.textContent = clues[i].clue;
      container.appendChild(li);
    }
  }

  function renderCrossword(cw) {
    var grid = cw.grid;
    var placed = cw.placed;
    var W = cw.width;
    var H = cw.height;
    var numbers = computeNumbers(grid);

    var cellInfo = {};
    var acrossClues = [];
    var downClues = [];

    for (var p = 0; p < placed.length; p++) {
      var pl = placed[p];
      var isAcross = pl.dx === 1;
      var num = numbers[pl.y + ',' + pl.x];
      var entry = { number: num, clue: pl.data.clue };
      if (isAcross) acrossClues.push(entry);
      else downClues.push(entry);
      for (var i = 0; i < pl.data.word.length; i++) {
        var key = (pl.y + pl.dy * i) + ',' + (pl.x + pl.dx * i);
        if (!cellInfo[key]) cellInfo[key] = { across: false, down: false, number: null };
        if (isAcross) cellInfo[key].across = true;
        else cellInfo[key].down = true;
        if (i === 0) cellInfo[key].number = num;
      }
    }

    acrossClues.sort(function (a, b) { return a.number - b.number; });
    downClues.sort(function (a, b) { return a.number - b.number; });

    var gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = 'repeat(' + W + ', minmax(0, 1fr))';
    state.cells = {};
    state.currentDirection = 'across';

    for (var gy = 0; gy < H; gy++) {
      for (var gx = 0; gx < W; gx++) {
        var letter = grid[gy][gx];
        var cellDiv = document.createElement('div');
        cellDiv.className = 'cell ' + (letter ? 'letter' : 'blank');
        if (letter) {
          var info = cellInfo[gy + ',' + gx] || { across: false, down: false, number: null };
          if (info.number) {
            var numSpan = document.createElement('span');
            numSpan.className = 'num';
            numSpan.textContent = info.number;
            cellDiv.appendChild(numSpan);
          }
          var input = document.createElement('input');
          input.type = 'text';
          input.setAttribute('autocomplete', 'off');
          input.setAttribute('autocapitalize', 'characters');
          input.setAttribute('autocorrect', 'off');
          input.setAttribute('spellcheck', 'false');
          input.dataset.x = gx;
          input.dataset.y = gy;
          input.dataset.answer = letter;
          if (info.across) input.dataset.across = '1';
          if (info.down) input.dataset.down = '1';
          input.setAttribute('aria-label', info.number ? ('Клетка ' + info.number) : 'Клетка кроссворда');
          cellDiv.appendChild(input);
          state.cells[gy + ',' + gx] = input;
        }
        gridEl.appendChild(cellDiv);
      }
    }

    renderClues('across-clues', acrossClues);
    renderClues('down-clues', downClues);
    updateDirectionIndicator();
  }

  // --- Ввод ---
  function latToCyr(ch) {
    return LAT_TO_CYR[ch] || ch;
  }

  function processInput(input) {
    var raw = input.value || '';
    var cleaned = '';
    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i).toUpperCase();
      ch = latToCyr(ch);
      if (ch === 'Ё') ch = 'Е';
      if (/[А-Я]/.test(ch)) cleaned += ch;
    }
    if (cleaned.length > 0) {
      input.value = cleaned.charAt(cleaned.length - 1);
      return true;
    }
    input.value = '';
    return false;
  }

  function getInputAt(x, y) {
    return state.cells[y + ',' + x] || null;
  }

  function moveInDirection(from, dx, dy) {
    var x = parseInt(from.dataset.x, 10);
    var y = parseInt(from.dataset.y, 10);
    var target = getInputAt(x + dx, y + dy);
    if (target) {
      try { target.focus(); } catch (e) {}
    }
  }

  function onGridInput(e) {
    var input = e.target;
    if (!input || input.tagName !== 'INPUT' || !input.dataset || !input.dataset.answer) return;
    var ok = processInput(input);
    input.classList.remove('wrong', 'correct');
    if (ok) {
      var dx = state.currentDirection === 'across' ? 1 : 0;
      var dy = state.currentDirection === 'down' ? 1 : 0;
      moveInDirection(input, dx, dy);
    }
  }

  function onGridKeydown(e) {
    var input = e.target;
    if (!input || input.tagName !== 'INPUT' || !input.dataset || !input.dataset.answer) return;
    var x = parseInt(input.dataset.x, 10);
    var y = parseInt(input.dataset.y, 10);
    var handled = false;
    switch (e.key) {
      case 'ArrowRight':
        state.currentDirection = 'across';
        updateDirectionIndicator();
        moveInDirection(input, 1, 0);
        handled = true;
        break;
      case 'ArrowLeft':
        state.currentDirection = 'across';
        updateDirectionIndicator();
        moveInDirection(input, -1, 0);
        handled = true;
        break;
      case 'ArrowDown':
        state.currentDirection = 'down';
        updateDirectionIndicator();
        moveInDirection(input, 0, 1);
        handled = true;
        break;
      case 'ArrowUp':
        state.currentDirection = 'down';
        updateDirectionIndicator();
        moveInDirection(input, 0, -1);
        handled = true;
        break;
      case ' ':
      case 'Spacebar':
        state.currentDirection = state.currentDirection === 'across' ? 'down' : 'across';
        updateDirectionIndicator();
        handled = true;
        break;
      case 'Backspace':
        if (!input.value) {
          var dxb = state.currentDirection === 'across' ? -1 : 0;
          var dyb = state.currentDirection === 'down' ? -1 : 0;
          var prev = getInputAt(x + dxb, y + dyb);
          if (prev) {
            try { prev.focus(); } catch (ex) {}
            prev.value = '';
            prev.classList.remove('wrong', 'correct');
            handled = true;
          }
        }
        break;
      default:
        break;
    }
    if (handled) e.preventDefault();
  }

  function onGridFocus(e) {
    var input = e.target;
    if (!input || input.tagName !== 'INPUT' || !input.dataset || !input.dataset.answer) return;
    var across = input.dataset.across === '1';
    var down = input.dataset.down === '1';
    if (across && !down) state.currentDirection = 'across';
    else if (!across && down) state.currentDirection = 'down';
    updateDirectionIndicator();
  }

  function updateDirectionIndicator() {
    var el = document.getElementById('dir-indicator');
    if (el) el.textContent = state.currentDirection === 'across' ? 'по горизонтали' : 'по вертикали';
  }

  // --- Действия ---
  function setMessage(text, type) {
    var el = document.getElementById('message');
    el.textContent = text || '';
    el.className = 'message' + (type ? ' ' + type : '');
  }

  function checkAnswers() {
    var wrong = 0, correct = 0, empty = 0, total = 0;
    for (var key in state.cells) {
      if (!Object.prototype.hasOwnProperty.call(state.cells, key)) continue;
      var input = state.cells[key];
      total++;
      input.classList.remove('wrong', 'correct');
      var val = (input.value || '').toUpperCase();
      if (!val) {
        empty++;
      } else if (val === input.dataset.answer) {
        correct++;
      } else {
        wrong++;
        input.classList.add('wrong');
      }
    }
    if (total === 0) {
      setMessage('Сначала создайте кроссворд.', 'error');
      return;
    }
    if (empty === 0 && wrong === 0) {
      setMessage('Поздравляем! Все ' + total + ' клеток заполнены верно.', 'success');
    } else if (wrong === 0 && empty > 0) {
      setMessage('Все введённые буквы верны. Осталось заполнить клеток: ' + empty + '.', 'info');
    } else {
      var parts = ['Верно: ' + correct + ' из ' + total];
      if (wrong > 0) parts.push('неверных: ' + wrong);
      if (empty > 0) parts.push('пустых: ' + empty);
      setMessage(parts.join('. ') + '.', 'error');
    }
  }

  function showAnswers() {
    for (var key in state.cells) {
      if (!Object.prototype.hasOwnProperty.call(state.cells, key)) continue;
      var input = state.cells[key];
      input.value = input.dataset.answer;
      input.classList.remove('wrong');
      input.classList.add('correct');
    }
    setMessage('Ответы показаны. Нажмите «Очистить» или «Новый кроссворд», чтобы начать заново.', 'info');
  }

  function clearGrid() {
    for (var key in state.cells) {
      if (!Object.prototype.hasOwnProperty.call(state.cells, key)) continue;
      var input = state.cells[key];
      input.value = '';
      input.classList.remove('wrong', 'correct');
    }
    setMessage('', '');
  }

  function newCrossword() {
    var sizeSelect = document.getElementById('size');
    var difficulty = DIFFICULTIES[sizeSelect.value] || DIFFICULTIES.medium;
    var seed = Math.floor(Math.random() * 1000000);
    var cw = generateCrossword(difficulty, seed);
    if (!cw || !cw.placed || cw.placed.length === 0) {
      setMessage('Не удалось сгенерировать кроссворд. Нажмите кнопку ещё раз.', 'error');
      return;
    }
    state.crossword = cw;
    renderCrossword(cw);
    setMessage('', '');
    var firstInput = null;
    for (var k in state.cells) {
      if (Object.prototype.hasOwnProperty.call(state.cells, k)) { firstInput = state.cells[k]; break; }
    }
    if (firstInput) { try { firstInput.focus(); } catch (e) {} }
  }

  // --- Инициализация ---
  function init() {
    var gridEl = document.getElementById('grid');
    gridEl.addEventListener('input', onGridInput);
    gridEl.addEventListener('keydown', onGridKeydown);
    gridEl.addEventListener('focusin', onGridFocus);

    document.getElementById('btn-new').addEventListener('click', newCrossword);
    document.getElementById('btn-check').addEventListener('click', checkAnswers);
    document.getElementById('btn-show').addEventListener('click', showAnswers);
    document.getElementById('btn-clear').addEventListener('click', clearGrid);
    document.getElementById('size').addEventListener('change', newCrossword);

    newCrossword();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
