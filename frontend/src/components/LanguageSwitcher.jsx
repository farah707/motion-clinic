import React from "react";

const LanguageSwitcher = ({ changeLanguage }) => {
  return (
    <div className="language-switcher">
      <button onClick={() => changeLanguage("en")}>English</button>
      <button onClick={() => changeLanguage("ar")}>العربية</button>
      <button onClick={() => changeLanguage("fr")}>Français</button>
    </div>
  );
};

export default LanguageSwitcher;
