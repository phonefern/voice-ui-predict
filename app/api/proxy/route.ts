import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const res = await fetch("https://chula-pd-voice-pd-api.hf.space/predict", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  return NextResponse.json(data);
}
