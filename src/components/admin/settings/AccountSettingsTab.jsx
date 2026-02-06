import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CreateAccountForm from "./CreateAccountForm";
import AssignEmployeeAccount from "./AssignEmployeeAccount";
import ProfilesTable from "./ProfilesTable";

export default function AccountSettingsTab() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create Account</TabsTrigger>
          <TabsTrigger value="assign">Assign Employee</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <CreateAccountForm />
          <ProfilesTable />
        </TabsContent>

        <TabsContent value="assign">
          <AssignEmployeeAccount />
        </TabsContent>
      </Tabs>
    </div>
  );
}
