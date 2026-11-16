(function () {
  'use strict';

  var searchInput = null;
  var clearButton = null;
  var resultsList = null;
  var statusMessage = null;
  var allEntries = [];
  var debounceTimer = null;

  var MAX_RESULTS = 100;
  var DEBOUNCE_MS = 150;

  function normalize(value) {
    return String(value || '').toLowerCase().trim();
  }

  function buildEntries(dictionary) {
    var entries = [];
    var keys = Object.keys(dictionary);

    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      var item = dictionary[key];

      if (!item || typeof item !== 'object') continue;

      var translation = item.translation;
      if (typeof translation !== 'string' || translation.trim() === '') continue;

      entries.push({
        word: key,
        translation: translation,
        pos: typeof item.pos === 'string' ? item.pos : '',
        example: typeof item.example === 'string' ? item.example : ''
      });
    }

    // Сортируем по алфавиту для исходного списка
    entries.sort(function (a, b) {
      return a.word.localeCompare(b.word);
    });

    return entries;
  }

  function setStatus(text) {
    if (statusMessage) {
      statusMessage.textContent = text;
    }
  }

  function clearResults() {
    if (resultsList) {
      while (resultsList.firstChild) {
        resultsList.removeChild(resultsList.firstChild);
      }
    }
  }

  function createResultElement(entry) {
    var li = document.createElement('li');
    li.className = 'result-item';

    var wordEl = document.createElement('p');
    wordEl.className = 'result-word';
    wordEl.textContent = entry.word;
    li.appendChild(wordEl);

    var translationEl = document.createElement('p');
    translationEl.className = 'result-translation';
    translationEl.textContent = entry.translation;
    li.appendChild(translationEl);

    var metaParts = [];
    if (entry.pos) metaParts.push(entry.pos);
    if (entry.example) metaParts.push('Пример: ' + entry.example);

    if (metaParts.length > 0) {
      var metaEl = document.createElement('p');
      metaEl.className = 'result-meta';
      metaEl.textContent = metaParts.join(' · ');
      li.appendChild(metaEl);
    }

    return li;
  }

  function renderResults(entries) {
    clearResults();

    if (!entries.length) {
      setStatus('Ничего не найдено. Попробуйте другое слово.');
      return;
    }

    var limit = Math.min(entries.length, MAX_RESULTS);
    var fragment = document.createDocumentFragment();

    for (var i = 0; i < limit; i += 1) {
      fragment.appendChild(createResultElement(entries[i]));
    }

    if (resultsList) {
      resultsList.appendChild(fragment);
    }

    if (entries.length > MAX_RESULTS) {
      setStatus('Показаны первые ' + MAX_RESULTS + ' результатов из ' + entries.length + '. Уточните запрос.');
    } else {
      setStatus('Найдено: ' + entries.length + '.');
    }
  }

  function search(query) {
    var normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      clearResults();
      setStatus('Введите слово, чтобы начать поиск.');
      return;
    }

    // Проверяем, есть ли в запросе кириллица (русские буквы)
    var isCyrillic = /[а-яА-ЯёЁ]/.test(normalizedQuery);
    
    // Разделяем результаты на категории для правильной сортировки
    var exactMatches = [];
    var startsWithMatches = [];
    var containsMatches = [];

    for (var i = 0; i < allEntries.length; i += 1) {
      var entry = allEntries[i];
      var wordLower = entry.word.toLowerCase();
      var translationLower = entry.translation.toLowerCase();

      if (isCyrillic) {
        // Если ввели по-русски, ищем по переводу
        if (translationLower === normalizedQuery) {
          exactMatches.push(entry);
        } else if (translationLower.indexOf(normalizedQuery) !== -1) {
          // Для русского языка не так важно, в начале слово или в середине
          containsMatches.push(entry); 
        }
      } else {
        // Если ввели по-английски, ищем строго по английскому слову
        if (wordLower === normalizedQuery) {
          exactMatches.push(entry);
        } else if (wordLower.indexOf(normalizedQuery) === 0) {
          startsWithMatches.push(entry);
        } else if (wordLower.indexOf(normalizedQuery) !== -1) {
          containsMatches.push(entry);
        }
      }
    }

    // Объединяем: сначала точные, потом начинающиеся, потом содержащие
    var results = exactMatches.concat(startsWithMatches).concat(containsMatches);
    
    renderResults(results);
  }

  function scheduleSearch() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      search(searchInput ? searchInput.value : '');
    }, DEBOUNCE_MS);
  }

  function handleClear() {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    clearResults();
    setStatus('Введите слово, чтобы начать поиск.');
  }

  function init() {
    searchInput = document.getElementById('search-input');
    clearButton = document.getElementById('clear-button');
    resultsList = document.getElementById('results-list');
    statusMessage = document.getElementById('status-message');

    if (!searchInput || !clearButton || !resultsList || !statusMessage) return;

    var dictionary = window.DICTIONARY;

    if (!dictionary || typeof dictionary !== 'object') {
      setStatus('Словарь не загружен. Проверьте файл data.js.');
      searchInput.disabled = true;
      clearButton.disabled = true;
      return;
    }

    allEntries = buildEntries(dictionary);

    if (!allEntries.length) {
      setStatus('Словарь пуст. Добавьте слова в data.js.');
      searchInput.disabled = true;
      clearButton.disabled = true;
      return;
    }

    setStatus('Словарь загружен. Слов: ' + allEntries.length + '.');

    searchInput.addEventListener('input', scheduleSearch);
    clearButton.addEventListener('click', handleClear);
    searchInput.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();