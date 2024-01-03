import * as p from "@clack/prompts";
import { setTimeout } from "node:timers/promises";
import color from "picocolors";
import { readFile } from "fs/promises";
import { MODELS_FIELDS } from "./constants.js";

var Users, Tickets, Organizations;

async function getResources() {
  const [users, tickets, organizations] = await Promise.all([
    readFile(new URL("./resources/users.json", import.meta.url)),
    readFile(new URL("./resources/tickets.json", import.meta.url)),
    readFile(new URL("./resources/organizations.json", import.meta.url)),
  ]);
  return {
    users: JSON.parse(users),
    tickets: JSON.parse(tickets),
    organizations: JSON.parse(organizations),
  };
}

async function printSearchDetail(resources) {
  const field = await p.text({
    message: "Enter search term",
    initialValue: "",
  });

  const val = await p.text({
    message: "Enter search value",
    initialValue: "",
  });

  await printResult(resources, field, val);
}

function compareVal(orgVal, desVal) {
  if (Array.isArray(orgVal)) {
    return orgVal.includes(desVal);
  }

  if (typeof orgVal == "number") {
    return orgVal === Number(desVal);
  }

  return orgVal === desVal;
}

function isIncludeField(obj, field) {
  let fields = Object.keys(obj);
  return fields.includes(field);
}

async function getTickets(field, val, includeRelationship = false) {
  if (!isIncludeField(Tickets[0], field)) {
    return undefined;
  }
  let result = Tickets.find((u) => compareVal(u[field], val));
  if (result && includeRelationship) {
    await setTimeout(200);

    const assign = await getUsers("_id", result.submitter_id);
    const submitted = await getUsers("_id", result.assignee_id);
    const organization = await getOrganizations("_id", result.organization_id);
    result = {
      ...result,
      assign_ticket_subject: assign?.subject,
      submitted_ticket_subject: submitted?.subject,
      organization_name: organization?.name,
    };
  }
  return result;
}

async function getOrganizations(field, val, includeRelationship = false) {
  if (!isIncludeField(Organizations[0], field)) {
    return undefined;
  }

  let result = Organizations.find((u) => compareVal(u[field], val));
  if (result && includeRelationship) {
    await setTimeout(200);
    const ticket = await getTickets("organization_id", result._id);
    const user = await getUsers("organization_id", result._id);
    result = {
      ...result,
      ticket_subject: ticket?.subject,
      user_name: user?.name,
    };
  }
  return result;
}

async function getUsers(field, val, includeRelationship = false) {
  if (!isIncludeField(Users[0], field)) {
    return undefined;
  }
  let result = Users.find((u) => compareVal(u[field], val));
  if (result && includeRelationship) {
    await setTimeout(200);
    const assign = await getTickets("assignee_id", result._id);
    const submitted = await getTickets("submitter_id", result._id);
    const organization = await getOrganizations("_id", result.organization_id);
    result = {
      ...result,
      assign_ticket_subject: assign?.subject,
      submitted_ticket_subject: submitted?.subject,
      organization_name: organization?.name,
    };
  }
  return result;
}

async function printResult(resources, field, val) {
  let result = undefined;
  const includeRelationship = true;
  switch (resources) {
    case "users":
      result = await getUsers(field, val, includeRelationship);
      break;
    case "tickets":
      result = await getTickets(field, val, includeRelationship);
      break;
    case "organizations":
      result = await getOrganizations(field, val, includeRelationship);
      break;
    default:
      break;
  }
  if (!result) {
    p.note("No resource not found");
  } else {
    console.log(result);
  }

  printWelcome();
}

async function printSearchScreen() {
  const searchOption = await p.select({
    message: "Select search options",
    initialValue: "user",
    options: [
      { value: "users", label: "Users" },
      { value: "tickets", label: "Tickets" },
      { value: "organizations", label: "Organizations" },
      { value: "back", label: "Back" },
    ],
  });
  switch (searchOption) {
    case "back":
      printWelcome();
      break;
    case "users":
    case "tickets":
    case "organizations":
      await printSearchDetail(searchOption);
      break;
    default:
      break;
  }
}

async function printFieldsScreen() {
  p.note(MODELS_FIELDS.USER, "Users");
  p.note(MODELS_FIELDS.TICKET, "Tickets");
  p.note(MODELS_FIELDS.ORGANIZATION, "Organizations");
  printWelcome();
}

async function printWelcome() {
  const value = await p.select({
    message: "Select search options",
    initialValue: "1",
    options: [
      { value: "1", label: "Select to search" },
      { value: "2", label: "Select to view a list of searchable fields" },
      { value: "3", label: "Select to exit app" },
    ],
  });

  switch (value) {
    case "1":
      await printSearchScreen();
      break;
    case "2":
      await printFieldsScreen();
      break;
    case "3":
      p.cancel();
      p.outro(`${color.bgMagenta(color.black(`Ok. Bye!`))}`);
      break;

    default:
      break;
  }
}

async function main() {
  console.clear();

  await setTimeout(200);
  const resources = await getResources();
  Users = resources.users;
  Tickets = resources.tickets;
  Organizations = resources.organizations;

  p.intro(`${color.bgMagenta(color.black(" Welcome "))}`);

  printWelcome();
}

main().catch(console.error);
