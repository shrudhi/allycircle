import { getAuth } from "@/lib/auth";

const handler = async (request: Request) => {
  const auth = await getAuth();
  return auth.handler(request);
};

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
