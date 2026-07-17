import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"https://graphicdesigndepartment.github.io","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});try{
 const url=Deno.env.get("SUPABASE_URL")!,pub=Deno.env.get("SUPABASE_ANON_KEY")!,secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const auth=req.headers.get("Authorization")??"";const userClient=createClient(url,pub,{global:{headers:{Authorization:auth}}});const admin=createClient(url,secret,{auth:{persistSession:false}});
 const token=auth.replace("Bearer ","");const {data:{user}}=await userClient.auth.getUser(token);if(!user)return reply({error:"Authentication required"},401);
 const {data:actor}=await admin.from("profiles").select("role").eq("id",user.id).single();if(!["staff","admin"].includes(actor?.role))return reply({error:"Staff access required"},403);
 const b=await req.json();if(b.action==="disable"){if(!b.authUserId)return reply({error:"Missing user"},400);const {error}=await admin.auth.admin.updateUserById(b.authUserId,{ban_duration:"876000h"});if(error)throw error;await admin.from("onboarding_invites").update({status:"disabled",disabled_at:new Date().toISOString()}).eq("auth_user_id",b.authUserId);return reply({status:"disabled"});}
 if(!b.email||!b.displayName||!b.accountId||!["individual","company_member","company_manager"].includes(b.relationship))return reply({error:"Invalid invite details"},400);
 const {data:account}=await admin.from("reward_accounts").select("id,kind,active").eq("id",b.accountId).single();if(!account?.active)return reply({error:"Select an active rewards account"},400);
 if((account.kind==="individual")!==(b.relationship==="individual"))return reply({error:"Relationship does not match account kind"},400);
 const redirectTo="https://graphicdesigndepartment.github.io/Onward-Tiers-Dashboard/";
 const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(String(b.email).trim().toLowerCase(),{redirectTo,data:{display_name:String(b.displayName).trim()}});if(inviteError)throw inviteError;const invitedUser=invited.user;if(!invitedUser)throw new Error("Invite did not create a user");
 const profile={id:invitedUser.id,display_name:String(b.displayName).trim(),role:"customer",individual_account_id:b.relationship==="individual"?b.accountId:null};const {error:profileError}=await admin.from("profiles").upsert(profile);if(profileError)throw profileError;
 if(b.relationship!=="individual"){const {error:m}=await admin.from("company_memberships").upsert({company_id:b.accountId,profile_id:invitedUser.id,is_account_manager:b.relationship==="company_manager"});if(m)throw m;}
 await admin.from("onboarding_invites").upsert({auth_user_id:invitedUser.id,account_id:b.accountId,relationship:b.relationship,status:"invited",invited_by:user.id,last_invited_at:new Date().toISOString(),failure_code:null},{onConflict:"auth_user_id"});
 await admin.from("audit_events").insert({actor_profile_id:user.id,event_type:"customer_invited",entity_type:"profile",entity_id:invitedUser.id,details:{account_id:b.accountId,relationship:b.relationship}});return reply({status:"invited",authUserId:invitedUser.id});
}catch(e){return reply({error:e instanceof Error?e.message:"Invite failed"},400)}});
