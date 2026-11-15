/* Наборы символов для генератора. Файл подключается обычным скриптом. */
(function (global) {
  "use strict";

  var UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var LOWER = "abcdefghijklmnopqrstuvwxyz";
  var DIGITS = "0123456789";
  var SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/|~";

  var SIMILAR = "0O1lI";

  function withoutSimilar(chars) {
    return chars.replace(new RegExp("[" + SIMILAR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "]", "g"), "");
  }

  global.PasswordData = {
    upper: UPPER,
    lower: LOWER,
    digits: DIGITS,
    symbols: SYMBOLS,
    similar: SIMILAR,
    withoutSimilar: withoutSimilar
  };
})(window);
