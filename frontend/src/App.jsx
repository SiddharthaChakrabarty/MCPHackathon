import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import GithubDetails from "./pages/GithubDetails";
import RepoRouter from './pages/RepoRouter';
import RepoOverview from './pages/RepoOverview';
import RepoCommits from './pages/RepoCommits';
import RepoMeet from './pages/RepoMeetAndCollaborators';
import RepoLinkedinProject from "./pages/RepoLinkedinProject";
import RepoRecommendations  from "./pages/RepoRecommendations";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/github-details" element={<GithubDetails />} />
        <Route path="/repo/:repoName/*" element={<RepoRouter/>}>
          <Route index element={<RepoOverview/>} />
          <Route path="overview" element={<RepoOverview/>} />
          <Route path="commits" element={<RepoCommits/>} />
          <Route path="meet" element={<RepoMeet/>} />
          <Route path="recommendations" element={<RepoRecommendations/>} />
          <Route path="linkedin" element={<RepoLinkedinProject/>} />
         </Route>
      </Routes>
    </BrowserRouter>
  );
}
