// Entry point - load polyfills FIRST before anything else
import './polyfills';

// Then import and register the App
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

