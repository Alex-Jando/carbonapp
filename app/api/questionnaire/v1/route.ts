import { QUESTIONNAIRE_V1 } from "../../../../src/questionnaire";

export async function GET(): Promise<Response> {
  return Response.json(QUESTIONNAIRE_V1);
}
