# Admin Dashboard Documentation

## Overview

The Admin Dashboard provides a centralized interface for managing users, monitoring system health, analyzing usage patterns, and configuring application settings.

## Navigation Structure

The dashboard has been reorganized into 5 main tabs for easier management:

### 1. Users
Manage all registered users in the system.

**Features:**
- View all users with their email addresses, creation dates, and status
- View user's persona runs by clicking the eye icon
- Manage user roles by clicking the shield icon
- Export user data to CSV
- Track AI usage per user
- View user activity and engagement

**User Roles:**
- **Admin**: Full access to all features including user management, system configuration, and analytics
- **Moderator**: Can view analytics and manage content but cannot modify system settings
- **User**: Standard user with access to create and manage their own personas

### 2. Analytics
Consolidated analytics dashboard combining all usage and performance metrics.

**Sections:**

#### AI Usage Analytics
- Total AI cost tracking across all users
- Token usage statistics (prompt, completion, and total tokens)
- Cost breakdown by model (GPT-5, GPT-5-mini, GPT-5-nano)
- Daily and monthly usage trends
- Real-time cost monitoring

#### Generation Analytics
- Persona generation success rates
- Average generation time per persona
- Codex completion statistics
- Failed generation analysis
- Peak usage times and patterns

#### Share Link Analytics
- Total shared personas
- View counts per shared link
- Password-protected share links
- Expiration tracking
- Most viewed personas

### 3. System Health
Monitor system performance and identify issues.

**Sections:**

#### Performance Optimization
- Database query performance
- API response times
- Edge function execution times
- Resource utilization metrics
- Optimization recommendations

#### Error Analysis
- Error categorization by type
- Error frequency and trends
- Failed persona runs
- Section generation failures
- Error resolution tracking

### 4. Audit Logs
Complete audit trail of all administrative actions.

**Tracked Actions:**
- User role modifications
- Persona deletions
- System setting changes
- Configuration updates
- Template modifications

**Log Details:**
- Admin who performed the action
- Timestamp of the action
- Target user/persona affected
- Detailed action description
- Additional metadata

### 5. Configuration
All system configuration settings organized into subtabs.

#### System Configuration

**Overview:**
Configure core application settings including branding and API keys.

**Settings:**

**Application Name:**
- Set the name displayed throughout the application
- Used in header, footer, and browser title
- Default: "CodeXAlpha"

**Application Logo:**
- Upload custom logo for branding
- Maximum file size: 2MB
- Supported formats: JPG, PNG, WEBP, SVG
- Logo is used in:
  - Header navigation
  - Footer
  - Browser favicon
  - Share previews and thumbnails

**OpenAI API Key:**
- Configure or update the OpenAI API key
- Required for AI-powered persona generation
- Key is stored securely
- Update existing key by entering a new one
- Leave empty to keep current key

**Security Notes:**
- Only admins can access this configuration
- API key updates are logged in audit trail
- Logo files are stored securely in system storage
- All changes require admin authentication

#### PDF Templates

**Overview:**
Customize how persona PDFs are generated and exported.

**Template Settings:**
- **Template Name**: Descriptive name for the template
- **Active Status**: Toggle to activate/deactivate template
- **Logo Upload**: Add custom logo to PDF exports
  - Maximum file size: 2MB
  - Supported formats: JPG, PNG, WEBP, SVG
  - Logo displays at the top of exported PDFs

**Typography:**
- **Title Font**: Font for main titles (e.g., "Coach Persona Blueprint")
- **Heading Font**: Font for section headings
- **Body Font**: Font for body text
- **Font Sizes**: Customizable sizes for title, heading, and body text

**Available Fonts:**
- TimesRoman (classic serif)
- TimesRomanBold (bold serif)
- TimesRomanItalic (italic serif)
- Helvetica (clean sans-serif)
- HelveticaBold (bold sans-serif)
- Courier (monospace)

**Layout:**
- **Page Margins**: Space around page content (in points)
- **Section Spacing**: Space between sections (in points)
- **Line Spacing**: Space between lines (in points)

**Colors:**
All colors use RGB values (0-1 scale):
- **Title Color**: Main title color
- **Heading Color**: Section heading color
- **Body Color**: Body text color

**Actions:**
- **Save**: Apply changes to selected template
- **Duplicate**: Create a copy of current template
- **Delete**: Remove template (cannot delete if active)
- **Activate**: Set template as default for exports

#### Codex Prompts

**Overview:**
Manage AI prompts used to generate different codex sections.

**Features:**
- View all active codex prompts
- Edit system prompts and section prompts
- Reorder codexes by display order
- Set word count ranges (min/max)
- Activate/deactivate codexes
- Duplicate existing codexes
- Create new custom codexes
- View dependency graph showing codex relationships
- Bulk dependency management across multiple codexes
- Bulk question mapping across multiple codexes

**Codex Structure:**
Each codex contains:
- **Codex Name**: Identifier for the codex (e.g., "Niche Clarity CODEX")
- **System Prompt**: Main instruction for AI generation
- **Display Order**: Order in which codexes are generated
- **Word Count**: Target word count range (min-max)
- **Sections**: Individual sections within the codex
- **Dependencies**: Questions or other codexes this codex depends on

**Managing Sections:**
- Add/edit/delete sections within each codex
- Set section-specific prompts
- Define section display order
- Set target word counts per section
- Activate/deactivate individual sections

**Dependencies:**
Each codex can have two types of dependencies:
1. **Question Dependencies**: Map specific questionnaire questions to this codex
   - Click on the question count badge to view all mapped questions
   - Questions are grouped by category for easy reference
   - Each question shows its text and helper text
2. **Codex Dependencies**: Reference content from another codex
   - Prevents circular dependencies
   - Shows dependency in the table view
   - Allows content reuse across codexes

**Bulk Operations:**
- **Bulk Dependencies**: Update dependencies for multiple codexes at once
- **Bulk Question Mapping**: Map the same questions to multiple codexes simultaneously
  - Select multiple codexes to update
  - Choose questions from all categories
  - Replaces existing mappings with new selections
  - Saves time when configuring multiple similar codexes

**Dependency Graph:**
- Visual representation of all codex relationships
- Shows which codexes depend on which
- Helps identify complex dependency chains
- Toggle on/off from the main view

#### Questions

**Overview:**
Customize the questionnaire that users fill out to generate their persona.

**Question Categories:**
1. **Backstory**: Questions about personal history and career journey
2. **Anchor**: Questions about core expertise and target audience
3. **Extended**: Questions about desired impact and future vision

**Question Management:**
- **Add New Questions**: Create custom questions for any category
- **Edit Questions**: Modify question text and settings
- **Reorder Questions**: Change display order within categories
- **Question Settings**:
  - Question text (the main question)
  - Helper text (optional guidance for users)
  - Required/Optional status
  - Active/Inactive status
  - Display order

**Questionnaire Settings:**
- **Introduction Text**: Custom message shown at questionnaire start
- **Minimum Answers**: Required number of answers per category
- **Category Descriptions**: Context for each question category

**Best Practices:**
- Keep questions clear and specific
- Use helper text to provide examples or clarification
- Mark essential questions as required
- Order questions from general to specific
- Test new questions before activating

## AI Output Format

### Human-Readable Content
All AI-generated content is automatically cleaned to ensure natural, human-readable format:

**Removed Elements:**
- Markdown formatting (**, *, #, etc.)
- Bullet points (•, *, -)
- Numbered lists (1., 2., etc.)
- Code formatting (`text`)
- Special characters used for formatting

**System Prompts:**
AI models are instructed to:
- Write in natural, conversational language
- Avoid all markdown and formatting characters
- Use paragraphs instead of bullet points
- Write as if speaking directly to the coach
- Avoid AI meta-commentary

## Active Generations Management

**Monitor Running Generations:**
- View all currently processing persona runs
- See user email and start time
- Cancel generations to save AI costs
- Useful for managing runaway or stuck generations

**When to Cancel:**
- User requests cancellation
- Generation is stuck or taking too long
- Need to free up resources
- Testing or development purposes

## System Settings

**Regeneration Cooldown:**
- Prevents users from regenerating personas too frequently
- Default: 60 minutes between regenerations
- Admins can bypass cooldown
- Adjustable per project needs

## Database Security

**Row-Level Security (RLS):**
All tables have proper RLS policies ensuring:
- Users can only see their own data
- Admins can view all data
- Proper authentication required
- Data isolation between users

**Storage Policies:**
- PDF template assets are publicly viewable
- Only admins can upload/modify template assets
- Secure file storage with access control

## Bulk Actions

**Multi-select Operations:**
When multiple persona runs are selected, available actions:
- Export selected runs to PDF
- Delete selected runs
- Batch operations for efficiency

## Export Features

**User Data Export:**
- Export all user data to CSV
- Includes: email, creation date, persona runs, AI usage
- Useful for analytics and reporting

**PDF Export:**
- Individual codex PDFs
- Complete persona PDFs
- Master PDF with all codexes
- Bulk export for multiple personas
- ZIP file generation for multiple exports

## Best Practices

### User Management
1. Regularly review user roles
2. Monitor AI usage to control costs
3. Check for inactive or suspicious accounts
4. Maintain admin role security

### Performance
1. Monitor generation times regularly
2. Address errors promptly
3. Optimize slow-running queries
4. Review resource utilization

### Content Quality
1. Test prompt changes on dev personas first
2. Review generated content quality
3. Adjust word counts based on user feedback
4. Keep templates updated and professional

### Security
1. Review audit logs periodically
2. Maintain least-privilege access
3. Keep admin team minimal
4. Monitor suspicious activity

## Troubleshooting

### Common Issues

**Persona Generation Failures:**
1. Check AI API keys are configured
2. Verify user has proper permissions
3. Review error logs in Error Analysis tab
4. Check if cooldown period is active

**PDF Export Issues:**
1. Ensure active template exists
2. Verify template settings are valid
3. Check logo URL is accessible
4. Review PDF export logs

**Permission Errors:**
1. Verify user role is correctly set
2. Check RLS policies are active
3. Ensure authentication is working
4. Review admin role assignments

**Performance Issues:**
1. Check active generations count
2. Review database query performance
3. Monitor AI API response times
4. Check for resource constraints

## API Integration

### Edge Functions
The system uses Supabase Edge Functions for:
- AI generation (OpenAI GPT models)
- PDF generation
- User management
- Analytics calculations

### OpenAI Integration
- Models: GPT-5, GPT-5-mini, GPT-5-nano
- Automatic token tracking
- Cost calculation per request
- Error handling and retries

## Data Privacy

**User Data:**
- All persona data is private by default
- Share links require explicit creation
- Password protection available
- Expiration dates supported

**Admin Access:**
- Admins can view all data for support
- All admin actions are logged
- Audit trail maintained
- Secure authentication required

## Support and Maintenance

**Regular Tasks:**
1. Review analytics weekly
2. Check error rates daily
3. Monitor AI costs
4. Update prompts as needed
5. Maintain templates
6. Review security logs

**Updates:**
- Keep questionnaire questions relevant
- Update prompts based on feedback
- Refresh PDF templates periodically
- Review and optimize performance

## Contact and Support

For technical issues or questions:
1. Review audit logs for recent changes
2. Check error analysis for patterns
3. Monitor system health metrics
4. Consult development team if needed

---

## New Features Summary

### Full Re-Run Persona
- **Purpose**: Completely regenerate all codexes using the latest active prompt configuration
- **Use Case**: When AI prompts have been updated and you want existing personas to use the new prompts
- **How it works**:
  1. Deletes all existing codexes and their sections for the persona run
  2. Creates new codexes based on current active codex_prompts configuration
  3. Creates all sections for each codex in pending status
  4. Resets persona run status to pending
  5. Triggers orchestration to begin generation
- **Access**: Available in Users tab → User's Persona Runs → Full Re-Run button
- **Warning**: This is a destructive action - all existing content will be deleted and regenerated

### Enhanced Persona Run Actions
Admin users now have comprehensive management options for each persona run:
- **View**: Navigate to the persona run detail page
- **Full Re-Run**: Complete regeneration with current prompts (deletes all existing content)
- **Regenerate**: Retry stuck or failed sections without deleting completed work
- **Cancel**: Stop an active generation process
- **Delete**: Permanently remove the persona run and all associated data

All destructive actions (Full Re-Run, Cancel, Delete) require confirmation before execution.

### User Blocking & Deletion
- Block users from generating personas
- Permanently delete user accounts
- Full audit trail of all actions

### Bulk Question Operations
- Activate/deactivate multiple questions at once
- Change category for multiple questions
- Delete multiple questions simultaneously
- Select all with one click

### Dashboard Stats Widget
- Real-time metrics at dashboard top
- Auto-refreshes every 30 seconds
- Shows: Total users, Active generations, Today's AI cost, Recent errors
- Trend indicators for quick insights

### User Management Enhancements
- **User Search & Filtering**: Quickly find users by email, role, or blocked status
- **Bulk User Actions**: 
  - Bulk role assignment for multiple users
  - Bulk password reset for selected users
  - Multi-select with checkboxes
- **Password Reset**: Admins can trigger password reset emails for users
- **Role Management**: 
  - User: Standard access to create personas
  - Moderator: View analytics and manage content
  - Admin: Full system access

### Adding Users

**Single User Creation:**
1. Click "Add User" button in the User Management section
2. Fill in required fields:
   - Full Name (required)
   - Email (required)
   - Role (optional: user, moderator, admin)
3. Choose whether to send password reset email
4. Default password: `codex@123` (if reset email not sent)
5. Users can log in immediately with default password

**Bulk Import Users:**
1. Click "Bulk Import" button
2. Download the CSV template
3. Fill in user data:
   - name (required)
   - email (required)
   - role (optional: user, moderator, admin)
4. Upload the completed CSV file
5. Preview imported users before confirming
6. All imported users receive default password: `codex@123`
7. View import results with success/failure counts

**Security Notes:**
- Default password `codex@123` should be changed by users on first login
- Consider enabling password reset email option for better security
- All user creation actions are logged in audit trail
- Users are automatically added to the profiles table

### Codex Management Enhancements
- **Dependency Tracking**: View question counts and codex dependencies at a glance
- **Dependency Details Modal**: Click question count to see all mapped questions grouped by category
- **Bulk Question Mapping**: Map the same questions to multiple codexes simultaneously
- **Question Validation**: Ensures codexes have either questions or a parent dependency
- **Visual Graph**: Interactive dependency graph showing relationships between codexes
- **Codex Prompt Linking**: Each codex is linked to its source prompt configuration via `codex_prompt_id`
  - Enables tracking which prompt version was used for generation
  - Useful for identifying codexes that need re-running after prompt updates

### User Experience Improvements
- **Codexes-First Layout**: Persona run view now displays generated codexes first, followed by source data (transcript/answers)
- **Better Visual Hierarchy**: Clear section headers separate codexes from source data
- **Improved Navigation**: Easier access to both generated content and original inputs
