-- Enable Row Level Security
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for user_connections table
CREATE POLICY "Users can create their own connections"
ON user_connections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own connections"
ON user_connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
ON user_connections
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
ON user_connections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create policies for user_activities table
CREATE POLICY "Users can create their own activities"
ON user_activities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activities"
ON user_activities
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
ON user_activities
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
ON user_activities
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);