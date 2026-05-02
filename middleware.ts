import { NextResponse } from "next/server";

export function middleware() {
  // 認証を無効化（常に通す）
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192.png|icon-512.png).*)",
  ],
};
