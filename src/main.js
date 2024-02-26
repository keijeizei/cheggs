import { createApp } from "vue";
import { SnackbarService } from "vue3-snackbar";
import "./style.css";
import "vue3-snackbar/styles";
import App from "./App.vue";

const app = createApp(App);

app.use(SnackbarService);

app.mount("#app");
