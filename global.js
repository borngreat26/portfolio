console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Determine base path depending on whether we're local or on GitHub Pages
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/website/";  // Replace "/website/" with your GitHub repo name if needed

// Pages to add to nav
let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/borngreat26', title: 'GitHub' },
];

// Create nav and prepend to body
let nav = document.createElement('nav');
document.body.prepend(nav);

// Build links
for (let p of pages) {
  let url = !p.url.startsWith('http') ? BASE_PATH + p.url : p.url;
  let title = p.title;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  // Highlight current page
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );

  // Open external links in new tab
  a.toggleAttribute("target", a.host !== location.host);

  nav.append(a);
}

// Step 4.2: Insert dark mode switch
document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`
  );
  
  // Step 4.4 + 4.5: Make it work + Save preference
  const select = document.querySelector('.color-scheme select');
  
  // Function to apply a color scheme
  function setColorScheme(scheme) {
    document.documentElement.style.setProperty('color-scheme', scheme);
    select.value = scheme;
  }
  
  // Load saved preference if any
  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
  }
  
  // Listen for user changes
  select.addEventListener('input', function (event) {
    const scheme = event.target.value;
    console.log('Color scheme changed to', scheme);
    setColorScheme(scheme);
    localStorage.colorScheme = scheme;
  });

  // Step 5: Intercept contact form submission and build mailto URL properly
const form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
  event.preventDefault(); // Prevent default submission behavior

  const data = new FormData(form);
  let params = [];

  for (let [name, value] of data) {
    // Encode each value for safe URL usage
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  const url = `${form.action}?${params.join('&')}`;
  location.href = url; // Open email client
});

  
