import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import GithubDetails from "./pages/GithubDetails";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/github-details" element={<GithubDetails />} />
      </Routes>
    </BrowserRouter>
  );
}
