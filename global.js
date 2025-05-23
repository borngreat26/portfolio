// global.js
console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Set correct base path for GitHub Pages
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

// Pages for navigation
let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/", title: "Resume" },
  { url: "meta/", title: "Meta" },
  { url: "https://github.com/borngreat26", title: "GitHub" },
];

// Create and add navigation
let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = !p.url.startsWith("http") ? BASE_PATH + p.url : p.url;
  let title = p.title;

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname,
  );
  a.toggleAttribute("target", a.host !== location.host);

  nav.append(a);
}

// Add theme selector
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`,
);

const select = document.querySelector(".color-scheme select");

function setColorScheme(scheme) {
  document.documentElement.style.setProperty("color-scheme", scheme);
  select.value = scheme;
}

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener("input", function (event) {
  const scheme = event.target.value;
  console.log("Color scheme changed to", scheme);
  setColorScheme(scheme);
  localStorage.colorScheme = scheme;
});

// Better contact form handling
const form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
  event.preventDefault();

  const data = new FormData(form);
  let params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  const url = `${form.action}?${params.join("&")}`;
  location.href = url;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
  }
}

export function renderProjects(
  projects,
  containerElement,
  headingLevel = "h2",
) {
  if (!containerElement || !Array.isArray(projects)) return;

  containerElement.innerHTML = "";

  projects.forEach((project) => {
    const article = document.createElement("article");
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image || ""}" alt="${project.title || "Project image"}">
      <div>
        <p>${project.description || ""}</p>
        <p class="project-year">${project.year || ""}</p>
      </div>
    `;
    containerElement.appendChild(article);
  });

  if (projects.length === 0) {
    containerElement.innerHTML = "<p>No projects available at the moment.</p>";
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
