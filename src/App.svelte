<script lang="ts">
  import Router from "svelte-spa-router";
  // import { initUserContext } from './context/user';
  import Home from "./routes/Home.svelte";
  import NotFound from "./routes/NotFound.svelte";

  // Initialize context like React Context.Provider
  // initUserContext();

  const routes = {
    "/": Home,
    "*": NotFound,
  };
</script>

<main>
  <Router {routes} />
</main>
