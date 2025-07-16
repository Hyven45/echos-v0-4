import { useState } from "react";
import SearchBar from "./SearchBar";

const Navigation = ({ isScrolled }: { isScrolled: boolean }) => {
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLanguageToggle = () => {
    setIsLanguageOpen(!isLanguageOpen);
  };

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const handleSearchClose = () => {
    setIsSearchOpen(false);
  };

  const handleLanguageKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleLanguageToggle();
    }
  };

  return (
    <nav
      className={`flex items-center justify-between bg-black/60 p-4 px-16 h-32 absolute top-0 left-0 right-0 z-50 ${
        isScrolled ? "scrolled" : ""
      }`}
      role="navigation"
      aria-label="Navigation principale"
    >
      <ul className="flex items-center gap-16 text-white text-3xl">
      <li>
          <a href="/#rocknroulette" aria-label="Section Notre crew">
            Rock'n'Roulette
          </a>
        </li>
        <li>
          <a
            href="/#branches-marginales"
            aria-label="Section Branches Marginals"
          >
            Branches Marginales
          </a>
        </li>
        <li>
          <a href="/#collage-monde" aria-label="Section Âmes rebelles">
            Nos Rookies
          </a>
        </li>
        <li>
  <a href="/notre-crew" aria-label="Section Notre crew">Notre crew</a>
  </li>
      </ul>

      <div className="absolute left-1/2 transform -translate-x-1/2">
        <img
          className="w-28 h-28"
          src="/public/assets/images/logo_echos.svg"
          alt="Logo ECHOS"
        />
      </div>

      <div className="flex items-center gap-8">
        <div
          className="search text-white text-3xl mr-8 cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label="Rechercher"
          onClick={handleSearchToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSearchToggle();
            }
          }}
        >
          <div className="flex items-center">
            <span className="mr-2" aria-hidden="true">
             <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="2rem" width="2rem" xmlns="http://www.w3.org/2000/svg"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"></path></svg> 
            </span>
          </div>
        </div>
        <div
          className="lang text-white text-3xl flex items-center flex-col"
          role="button"
          tabIndex={0}
          aria-label="Changer de langue"
          onClick={handleLanguageToggle}
          onKeyDown={handleLanguageKeyDown}
        >
          <span className="h-8">FR</span>
          <span
            aria-hidden="true"
            className="font-hitmepunk transform rotate-[280deg] inline-block"
          >
            {"<"}
          </span>
        </div>
      </div>

      <SearchBar isOpen={isSearchOpen} onClose={handleSearchClose} />
    </nav>
  );
};

export default Navigation;
