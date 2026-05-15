import { Route, Router } from "@solidjs/router";
import type { Component } from "solid-js";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import ProjectPage from "./pages/ProjectPage";
import TaskPage from "./pages/TaskPage";
import SettingsPage from "./pages/SettingsPage";
import GlobalLabelsPage from "./pages/GlobalLabelsPage";
import ProjectSettingsPage from "./pages/ProjectSettingsPage";

const App: Component = () => {
  return (
    <Router>
      <Route path="" component={AppLayout}>
        <Route path="/" component={HomePage} />
        <Route path="/projects/:id" component={ProjectPage} />
        <Route path="/projects/:id/settings" component={ProjectSettingsPage} />
        <Route path="/projects/:projectId/tasks/:taskId" component={TaskPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/labels" component={GlobalLabelsPage} />
      </Route>
    </Router>
  );
};

export default App;
