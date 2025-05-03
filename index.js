import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projectsContainer = document.querySelector('.projects');
const heading = document.createElement('h2');
heading.textContent = 'Latest Projects';
projectsContainer?.before(heading);

// Fetch and display latest 3 projects
const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);
renderProjects(latestProjects, projectsContainer, 'h3');

// GitHub stats
const profileStats = document.querySelector('#profile-stats');

const githubData = await fetchGitHubData('borngreat26'); // replace with your GitHub username
if (profileStats && githubData) {
  profileStats.innerHTML = `
    <h2>GitHub Stats</h2>
    <dl class="github-grid">
      <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
      <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
      <dt>Followers:</dt><dd>${githubData.followers}</dd>
      <dt>Following:</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}

