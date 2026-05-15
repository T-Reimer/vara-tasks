import { Route, Router } from "@solidjs/router";
import type { Component } from "solid-js";
import HomePage from "./pages/HomePage";
import ProjectPage from "./pages/ProjectPage";
import TaskPage from "./pages/TaskPage";
import SettingsPage from "./pages/SettingsPage";
import GlobalLabelsPage from "./pages/GlobalLabelsPage";

const App: Component = () => {
  return (
    <Router>
      <Route path="/" component={HomePage} />
      <Route path="/projects/:id" component={ProjectPage} />
      <Route path="/projects/:projectId/tasks/:taskId" component={TaskPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/labels" component={GlobalLabelsPage} />
    </Router>
  );
};

export default App;
