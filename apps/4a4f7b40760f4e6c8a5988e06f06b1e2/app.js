(function () {
  "use strict";

  var data = window.PasswordData;

  var lengthRange = document.getElementById("length-range");
  var lengthNumber = document.getElementById("length-number");
  var useUpper = document.getElementById("use-upper");
  var useLower = document.getElementById("use-lower");
  var useDigits = document.getElementById("use-digits");
  var useSymbols = document.getElementById("use-symbols");
  var excludeSimilar = document.getElementById("exclude-similar");
  var generateBtn = document.getElementById("generate-btn");
  var copyBtn = document.getElementById("copy-btn");
  var passwordOutput = document.getElementById("password-output");
  var entropyInfo = document.getElementById("entropy-info");
  var statusMessage = document.getElementById("status-message");

  var MIN_LENGTH = 8;
  var MAX_LENGTH = 64;

  /* ---------- Криптостойкий случайный выбор ---------- */

  function randomInt(maxExclusive) {
    if (maxExclusive <= 0) {
      return 0;
    }

    if (
      window.crypto &&
      typeof window.crypto.getRandomValues === "function"
    ) {
      var limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
      var buf = new Uint32Array(1);
      do {
        window.crypto.getRandomValues(buf);
      } while (buf[0] >= limit);
      return buf[0] % maxExclusive;
    }

    return Math.floor(Math.random() * maxExclusive);
  }

  function pickRandom(str) {
    return str.charAt(randomInt(str.length));
  }

  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i -= 1) {
      var j = randomInt(i + 1);
      var tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  /* ---------- Настройки и генерация ---------- */

  function clampLength(value) {
    var n = parseInt(value, 10);
    if (!Number.isFinite(n)) {
      return 16;
    }
    return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, n));
  }

  function getSelectedPools() {
    var pools = [];
    if (useUpper.checked) pools.push({ name: "upper", chars: data.upper });
    if (useLower.checked) pools.push({ name: "lower", chars: data.lower });
    if (useDigits.checked) pools.push({ name: "digits", chars: data.digits });
    if (useSymbols.checked) pools.push({ name: "symbols", chars: data.symbols });

    if (excludeSimilar.checked) {
      pools = pools.map(function (pool) {
        return { name: pool.name, chars: data.withoutSimilar(pool.chars) };
      });
    }

    return pools.filter(function (pool) {
      return pool.chars.length > 0;
    });
  }

  function buildAlphabet(pools) {
    var alphabet = "";
    for (var i = 0; i < pools.length; i += 1) {
      alphabet += pools[i].chars;
    }
    return alphabet;
  }

  function generatePassword(length, pools) {
    if (pools.length === 0) {
      return null;
    }

    var alphabet = buildAlphabet(pools);
    if (alphabet.length === 0) {
      return null;
    }

    var chars = [];

    for (var i = 0; i < pools.length && chars.length < length; i += 1) {
      chars.push(pickRandom(pools[i].chars));
    }

    while (chars.length < length) {
      chars.push(pickRandom(alphabet));
    }

    return shuffle(chars).slice(0, length).join("");
  }

  function estimateEntropy(length, alphabetSize) {
    if (alphabetSize <= 1) {
      return 0;
    }
    return length * (Math.log(alphabetSize) / Math.log(2));
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.classList.remove("status--error", "status--success");
    if (type === "error") {
      statusMessage.classList.add("status--error");
    } else if (type === "success") {
      statusMessage.classList.add("status--success");
    }
  }

  /* ---------- Обновление интерфейса ---------- */

  function syncLengthInputs(source) {
    var value = clampLength(source.value);
    lengthRange.value = String(value);
    lengthNumber.value = String(value);
    return value;
  }

  function updateResult() {
    var length = clampLength(lengthRange.value);
    var pools = getSelectedPools();

    if (pools.length === 0) {
      passwordOutput.textContent = "";
      entropyInfo.textContent = "";
      showStatus("Выберите хотя бы одну категорию символов.", "error");
      return;
    }

    var password = generatePassword(length, pools);

    if (!password) {
      passwordOutput.textContent = "";
      entropyInfo.textContent = "";
      showStatus("Не удалось сгенерировать пароль. Попробуйте ещё раз.", "error");
      return;
    }

    var alphabetSize = buildAlphabet(pools).length;
    var entropy = estimateEntropy(length, alphabetSize);

    passwordOutput.textContent = password;
    entropyInfo.textContent =
      "Приблизительная энтропия: " +
      Math.round(entropy) +
      " бит. Длина: " +
      length +
      " символов.";

    showStatus("Пароль сгенерирован.", "success");
  }

  /* ---------- Копирование ---------- */

  function copyPassword() {
    var text = passwordOutput.textContent;

    if (!text) {
      showStatus("Сначала сгенерируйте пароль.", "error");
      return;
    }

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard.writeText(text).then(
        function () {
          showStatus("Пароль скопирован в буфер обмена.", "success");
        },
        function () {
          showStatus(
            "Не удалось скопировать автоматически. Выделите пароль и скопируйте вручную.",
            "error"
          );
        }
      );
    } else {
      showStatus(
        "Копирование недоступно в этом окружении. Выделите пароль и скопируйте вручную.",
        "error"
      );
    }
  }

  /* ---------- События ---------- */

  lengthRange.addEventListener("input", function () {
    syncLengthInputs(lengthRange);
  });

  lengthNumber.addEventListener("input", function () {});

  lengthNumber.addEventListener("change", function () {
    syncLengthInputs(lengthNumber);
  });

  generateBtn.addEventListener("click", function () {
    syncLengthInputs(lengthRange);
    updateResult();
  });

  copyBtn.addEventListener("click", copyPassword);

  [useUpper, useLower, useDigits, useSymbols, excludeSimilar].forEach(function (el) {
    el.addEventListener("change", function () {
      showStatus("");
    });
  });

  updateResult();
})();
