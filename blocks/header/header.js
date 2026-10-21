import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// desktop layout kicks in at 1200px (logo + 2 contact boxes + button need the room)
const isDesktop = window.matchMedia('(min-width: 1200px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('.nav-hamburger button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-drop > button').forEach((button) => {
    button.setAttribute('aria-expanded', expanded);
  });
}

function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  if (isDesktop.matches) nav.removeAttribute('aria-expanded');
  else nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  // dropdowns always start collapsed
  toggleAllNavSections(navSections, false);
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');

  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['topbar', 'brand', 'info', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navTopbar = nav.querySelector('.nav-topbar');
  const navBrand = nav.querySelector('.nav-brand');
  const navInfo = nav.querySelector('.nav-info');
  const navSections = nav.querySelector('.nav-sections');
  const navTools = nav.querySelector('.nav-tools');

  // Mail / Call boxes: wrap everything except the icon in a text container
  navInfo?.querySelectorAll('p').forEach((p) => {
    const icon = p.querySelector(':scope > .icon');
    if (!icon) return;
    p.classList.add('nav-contact');
    const text = document.createElement('div');
    text.className = 'nav-contact-text';
    [...p.childNodes].forEach((node) => {
      if (node !== icon) text.append(node);
    });
    p.append(text);
  });

  // dropdowns
  navSections?.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
    const subList = navSection.querySelector(':scope > ul');
    if (!subList) return;
    navSection.classList.add('nav-drop');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-expanded', false);
    [...navSection.childNodes].forEach((node) => {
      if (node !== subList) button.append(node);
    });
    navSection.prepend(button);

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      if (isDesktop.matches) {
        button.focus();
        toggleAllNavSections(navSections);
      }
      button.setAttribute('aria-expanded', !expanded);
    });

    // open on hover (desktop)
    navSection.addEventListener('mouseenter', () => {
      if (!isDesktop.matches) return;
      toggleAllNavSections(navSections);
      button.setAttribute('aria-expanded', 'true');
    });
    navSection.addEventListener('mouseleave', () => {
      if (isDesktop.matches) button.setAttribute('aria-expanded', 'false');
    });
  });

  // hamburger (mobile)
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));

  // regroup: topbar | main (brand + info) | bar (tools + hamburger + menu)
  const main = document.createElement('div');
  main.className = 'nav-main';
  main.append(...[navBrand, navInfo].filter(Boolean));

  const bar = document.createElement('div');
  bar.className = 'nav-bar';
  bar.append(...[navTools, hamburger, navSections].filter(Boolean));

  nav.append(main, bar);
  if (navTopbar) nav.prepend(navTopbar);

  nav.setAttribute('aria-expanded', 'false');
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}