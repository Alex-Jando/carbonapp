import { QUESTIONNAIRE_V1 } from "../../../../questionnaire";

export async function GET(): Promise<Response> {
  return Response.json(QUESTIONNAIRE_V1);
}
