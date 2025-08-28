import { supabase } from '../src/lib/supabase'
import { useState, useEffect } from 'react'

function GoogleAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    
    getCurrentUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // This is where users will be redirected after successful sign in
          redirectTo: `${window.location.origin}/dashboard`, // Change this to your desired page
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })

      if (error) {
        alert('Error signing in with Google: ' + error.message)
      }
      // Note: The redirect happens automatically, so user won't see loading state end
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        alert('Error signing out: ' + error.message)
      } else {
        setUser(null)
        // Optionally redirect to home page
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {!user ? (
        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center justify-center bg-white border border-gray-300 rounded-lg px-4 py-2 shadow hover:bg-gray-50 transition disabled:opacity-50"
        >
          {/* Google icon SVG */}
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><g><path fill="#4285F4" d="M21.805 10.023h-9.18v3.955h5.627c-.243 1.3-1.47 3.82-5.627 3.82-3.384 0-6.14-2.8-6.14-6.25s2.756-6.25 6.14-6.25c1.93 0 3.23.82 3.97 1.53l2.71-2.63C17.09 2.62 14.7 1.5 12.01 1.5 6.76 1.5 2.5 5.76 2.5 11s4.26 9.5 9.51 9.5c5.47 0 9.09-3.84 9.09-9.25 0-.62-.07-1.09-.16-1.48z"/><path fill="#34A853" d="M3.65 7.68l3.28 2.41c.9-1.7 2.6-2.91 4.58-2.91 1.39 0 2.62.48 3.59 1.41l2.69-2.62C15.23 3.6 13.76 3 12.01 3c-3.13 0-5.8 1.8-7.09 4.68z"/><path fill="#FBBC05" d="M12.01 21c2.43 0 4.47-.8 5.96-2.18l-2.75-2.25c-.74.5-1.7.8-3.21.8-2.47 0-4.57-1.67-5.32-3.92l-3.25 2.5C4.18 18.98 7.82 21 12.01 21z"/><path fill="#EA4335" d="M21.805 10.023h-9.18v3.955h5.627c-.243 1.3-1.47 3.82-5.627 3.82-3.384 0-6.14-2.8-6.14-6.25s2.756-6.25 6.14-6.25c1.93 0 3.23.82 3.97 1.53l2.71-2.63C17.09 2.62 14.7 1.5 12.01 1.5 6.76 1.5 2.5 5.76 2.5 11s4.26 9.5 9.51 9.5c5.47 0 9.09-3.84 9.09-9.25 0-.62-.07-1.09-.16-1.48z" opacity=".1"/></g></svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      ) : (
        <div className="flex flex-col items-center space-y-2">
          <span className="text-gray-700">Signed in as {user.email}</span>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default GoogleAuth