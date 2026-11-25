// Execução isolada do catálogo (http://localhost:3002), útil para o time do
// catálogo desenvolver sem depender do host.
import { mount } from "./mount.js";

mount(document.getElementById("root"));
