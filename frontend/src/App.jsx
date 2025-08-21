import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import GithubDetails from "./pages/GithubDetails";
import RepoDetails from "./pages/RepoDetails";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/github-details" element={<GithubDetails />} />
        <Route path="/repo/:repoName" element={<RepoDetails />} />
      </Routes>
    </BrowserRouter>
  );
}
