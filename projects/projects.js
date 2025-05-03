import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const titleElement = document.querySelector('.projects-title');

fetchJSON('../lib/projects.json').then(projects => {
  renderProjects(projects, projectsContainer, 'h2');
  if (titleElement) {
    titleElement.textContent += ` (${projects.length})`;
  }
});
