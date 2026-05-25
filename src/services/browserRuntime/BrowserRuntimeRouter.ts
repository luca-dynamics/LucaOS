import {

  BrowserRuntimeRequest,
  BrowserRuntimeRouteResult,
} from "./types";

export class BrowserRuntimeRouter {


  registerAdapter(adapter: BrowserRuntimeAdapter): void {
    this.adapters.push(adapter);
  }

  }
}
