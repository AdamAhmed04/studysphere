import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Clock, BookOpen, Users, Trophy, Globe, Camera, Upload, X } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { errorMessage } from '../utils/errors';

// No props: everything comes from the auth context.
export const AuthPage: React.FC = () => {
  const { signIn, signUp, resetPassword, loading, error } = useAuthContext();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [signUpStep, setSignUpStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: null as File | null,
    bio: '',
    dateOfBirth: '',
    school: '',
    studyField: '',
    graduationDate: '',
    grade: '',
    interests: [] as string[],
    isPublic: true
  });
  const [newInterest, setNewInterest] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSymbol: false,
  });

  const validatePassword = (password: string) => {
    const strength = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    };
    setPasswordStrength(strength);
    return strength;
  };

  const isPasswordValid = (password: string) => {
    const strength = validatePassword(password);
    return Object.values(strength).every(Boolean);
  };
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (isSignUp && !formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (isSignUp && !isPasswordValid(formData.password)) {
      newErrors.password = 'Password does not meet requirements';
    } else if (!isSignUp && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (isSignUp) {
        if (signUpStep === 1) {
          setSignUpStep(2);
          return;
        }
        
        const userData = {
          name: formData.username,
          email: formData.email,
          password: formData.password,
          avatar: formData.avatar || undefined,
          bio: formData.bio || undefined,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
          school: formData.school || undefined,
          studyField: formData.studyField || undefined,
          graduationDate: formData.graduationDate ? new Date(formData.graduationDate) : undefined,
          grade: formData.grade || undefined,
          interests: formData.interests,
          isPublic: formData.isPublic
        };
        await signUp(userData);
        // Success message will be handled by the auth state change
      } else {
        await signIn(formData.email, formData.password);
        // Success message will be handled by the auth state change
      }
    } catch (err) {
      // Error is handled by useAuth hook
      console.error('Authentication error:', err);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate password strength in real-time for sign up
    if (field === 'password' && isSignUp) {
      validatePassword(value);
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setSignUpStep(1);
    setShowForgotPassword(false);
    setResetEmail('');
    setResetMessage('');
    setResetError('');
    setFormData({ 
      username: '', 
      email: '', 
      password: '', 
      confirmPassword: '',
      avatar: null,
      bio: '',
      dateOfBirth: '',
      school: '',
      studyField: '',
      graduationDate: '',
      grade: '',
      interests: [],
      isPublic: true
    });
    setErrors({});
    setAvatarPreview(null);
    setPasswordStrength({
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSymbol: false,
    });
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, avatar: 'Please select a valid image file' }));
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, avatar: 'Image size must be less than 5MB' }));
        return;
      }
      
      setFormData(prev => ({ ...prev, avatar: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear any previous errors
      if (errors.avatar) {
        setErrors(prev => ({ ...prev, avatar: '' }));
      }
    }
  };

  const removeAvatar = () => {
    setFormData(prev => ({ ...prev, avatar: null }));
    setAvatarPreview(null);
    // Reset file input
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const goBackToStep1 = () => {
    setSignUpStep(1);
    setErrors({});
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail.trim()) {
      setResetError('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError('Please enter a valid email address');
      return;
    }

    try {
      setResetLoading(true);
      setResetError('');
      await resetPassword(resetEmail);
      setResetMessage('Password reset email sent! Please check your inbox.');
    } catch (err) {
      setResetError(errorMessage(err, 'Failed to send reset email'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetMessage('');
    setResetError('');
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:block space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
              <div className="w-12 h-12 bg-surface-high rounded-xl flex items-center justify-center">
                <Clock className="text-white" size={28} />
              </div>
              <h1 className="text-4xl font-bold text-ink">
                StudySphere
              </h1>
            </div>
            <h2 className="text-3xl font-bold text-ink mb-4">
              Transform Your Study Experience
            </h2>
            <p className="text-xl text-ink/75 mb-8">
              Join thousands of students who are boosting their productivity with our social study timer
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-surface-high rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="text-sand" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink mb-2">Smart Study Timer</h3>
                <p className="text-ink/75">Customizable timers with breaks, themes, and progress tracking</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="text-emerald-300" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink mb-2">Study with Friends</h3>
                <p className="text-ink/75">Connect with study buddies and stay motivated together</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-surface-high rounded-xl flex items-center justify-center flex-shrink-0">
                <Trophy className="text-sand" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink mb-2">Track Progress</h3>
                <p className="text-ink/75">Monitor your study streaks and compete on leaderboards</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-sand/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink mb-2">Share Resources</h3>
                <p className="text-ink/75">Exchange notes and study materials with your network</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-surface rounded-2xl shadow-2xl p-8">
            
            {/* Mobile Branding */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-surface-high rounded-lg flex items-center justify-center">
                  <Clock className="text-white" size={20} />
                </div>
                <h1 className="text-2xl font-bold text-ink">
                  StudySphere
                </h1>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-ink mb-2">
                {isSignUp ? (signUpStep === 1 ? 'Create Account' : 'Complete Profile') : 'Welcome Back'}
              </h2>
              <p className="text-ink/75">
                {isSignUp 
                  ? (signUpStep === 1 ? 'Join the community and start studying smarter' : 'Tell us more about yourself')
                  : 'Sign in to continue your study journey'
                }
              </p>
            </div>

            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label htmlFor="authpage-email-address-2" className="block text-sm font-medium text-ink/75 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-muted" />
                    </div>
                    <input id="authpage-email-address-2"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                      placeholder="Enter your email"
                      disabled={resetLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl btn-primary"
                >
                  {resetLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToSignIn}
                    className="text-sand hover:text-ink font-medium transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Basic Info */}
              {isSignUp && signUpStep === 1 && (
                <>
                  <div>
                    <label htmlFor="authpage-username" className="block text-sm font-medium text-ink/75 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-muted" />
                      </div>
                      <input id="authpage-username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent transition-all ${
                          errors.username ? 'border-red-500' : 'border-hairline'
                        }`}
                        placeholder="Choose a username"
                        maxLength={100}
                      />
                    </div>
                    {errors.username && <p className="mt-1 text-sm text-red-300">{errors.username}</p>}
                  </div>
                </>
              )}

              {/* Step 2: Extended Profile Info */}
              {isSignUp && signUpStep === 2 && (
                <div>
                  {/* Profile Photo Upload */}
                  <div className="mb-6">
                    <div id="authpage-profile-photo" className="block text-sm font-medium text-ink/75 mb-3">
                      Profile Photo (Optional)
                    </div>
                    <div role="group" aria-labelledby="authpage-profile-photo" className="flex items-center space-x-4">
                      <div className="relative">
                        {avatarPreview ? (
                          <div className="relative">
                            <img
                              src={avatarPreview}
                              alt="Profile preview"
                              className="w-20 h-20 rounded-full object-cover border-4 border-hairline-soft"
                            />
                            <button
                              type="button"
                              onClick={removeAvatar}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-surface-high flex items-center justify-center">
                            <Camera className="text-white" size={24} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <input
                          type="file"
                          id="avatar-upload"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="avatar-upload"
                          className="flex items-center space-x-2 px-4 py-2 bg-surface-high hover:bg-gray-200 text-ink/75 rounded-lg cursor-pointer transition-colors"
                        >
                          <Upload size={16} />
                          <span>{avatarPreview ? 'Change Photo' : 'Upload Photo'}</span>
                        </label>
                        <p className="text-xs text-muted mt-1">
                          JPG, PNG, GIF up to 5MB
                        </p>
                        {errors.avatar && (
                          <p className="text-xs text-red-300 mt-1">{errors.avatar}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="authpage-date-of-birth" className="block text-sm font-medium text-ink/75 mb-2">
                        Date of Birth
                      </label>
                      <input id="authpage-date-of-birth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="authpage-grade-year" className="block text-sm font-medium text-ink/75 mb-2">
                        Grade/Year
                      </label>
                      <select id="authpage-grade-year"
                        value={formData.grade}
                        onChange={(e) => handleInputChange('grade', e.target.value)}
                        className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                      >
                        <option value="">Select Grade</option>
                        <option value="9th Grade">9th Grade</option>
                        <option value="10th Grade">10th Grade</option>
                        <option value="11th Grade">11th Grade</option>
                        <option value="12th Grade">12th Grade</option>
                        <option value="Freshman">Freshman</option>
                        <option value="Sophomore">Sophomore</option>
                        <option value="Junior">Junior</option>
                        <option value="Senior">Senior</option>
                        <option value="Graduate">Graduate</option>
                        <option value="PhD">PhD</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="authpage-bio" className="block text-sm font-medium text-ink/75 mb-2">
                      Bio
                    </label>
                    <textarea id="authpage-bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                      maxLength={2000}
                      rows={3}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent resize-none theme-textbox"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="authpage-school-university" className="block text-sm font-medium text-ink/75 mb-2">
                        School/University
                      </label>
                      <input id="authpage-school-university"
                        type="text"
                        value={formData.school}
                        onChange={(e) => handleInputChange('school', e.target.value)}
                        placeholder="e.g., Harvard University"
                        maxLength={200}
                        className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="authpage-field-of-study" className="block text-sm font-medium text-ink/75 mb-2">
                        Field of Study
                      </label>
                      <input id="authpage-field-of-study"
                        type="text"
                        value={formData.studyField}
                        onChange={(e) => handleInputChange('studyField', e.target.value)}
                        placeholder="e.g., Computer Science"
                        maxLength={200}
                        className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="authpage-expected-graduation-date" className="block text-sm font-medium text-ink/75 mb-2">
                      Expected Graduation Date
                    </label>
                    <input id="authpage-expected-graduation-date"
                      type="date"
                      value={formData.graduationDate}
                      onChange={(e) => handleInputChange('graduationDate', e.target.value)}
                      className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="authpage-interests" className="block text-sm font-medium text-ink/75 mb-2">
                      Interests
                    </label>
                    <div className="flex space-x-3 mb-3">
                      <input id="authpage-interests"
                        type="text"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        placeholder="Add an interest (e.g., Mathematics, History)"
                        maxLength={50}
                        className="flex-1 px-4 py-2 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={addInterest}
                        className="px-3 py-1 text-sm bg-surface-high text-ink/75 rounded-lg hover:bg-gray-200 transition-colors secondary-btn"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {formData.interests.map(interest => (
                        <span
                          key={interest}
                          className="inline-flex items-center px-3 py-1 bg-surface-high text-ink rounded-full text-sm cursor-pointer hover:bg-blue-200 transition-colors"
                          onClick={() => removeInterest(interest)}
                        >
                          {interest} ✕
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface rounded-xl">
                    <div className="flex items-center space-x-3">
                      {formData.isPublic ? <Globe className="text-sand" size={20} /> : <Lock className="text-muted" size={20} />}
                      <div>
                        <p className="font-medium text-ink">Public Profile</p>
                        <p className="text-sm text-ink/75">
                          Allow others to find and add you as a friend
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.isPublic ? 'bg-sand' : 'bg-surface-high border border-hairline'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-pearl transition-transform ${
                          formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {(!isSignUp || signUpStep === 1) && (
                <div>
                  <label htmlFor="authpage-email-address" className="block text-sm font-medium text-ink/75 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-muted" />
                    </div>
                    <input id="authpage-email-address"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent transition-all ${
                        errors.email ? 'border-red-500' : 'border-hairline'
                      }`}
                      placeholder="Enter your email"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-sm text-red-300">{errors.email}</p>}
                </div>
              )}

              {(!isSignUp || signUpStep === 1) && (
                <div>
                  <label htmlFor="authpage-password" className="block text-sm font-medium text-ink/75 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-muted" />
                    </div>
                    <input id="authpage-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent transition-all ${
                        errors.password ? 'border-red-500' : 'border-hairline'
                      }`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-muted hover:text-ink" />
                      ) : (
                        <Eye className="h-5 w-5 text-muted hover:text-ink" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-300">{errors.password}</p>}
                  
                  {/* Password Strength Indicator for Sign Up */}
                  {isSignUp && formData.password && (
                    <div className="mt-3 p-3 bg-surface rounded-lg">
                      <p className="text-sm font-medium text-ink/75 mb-2">Password Requirements:</p>
                      <div className="space-y-1">
                        <div className={`flex items-center text-xs ${
                          passwordStrength.minLength ? 'text-emerald-300' : 'text-muted'
                        }`}>
                          <span className="mr-2">{passwordStrength.minLength ? '✓' : '○'}</span>
                          At least 8 characters
                        </div>
                        <div className={`flex items-center text-xs ${
                          passwordStrength.hasUppercase ? 'text-emerald-300' : 'text-muted'
                        }`}>
                          <span className="mr-2">{passwordStrength.hasUppercase ? '✓' : '○'}</span>
                          One uppercase letter (A-Z)
                        </div>
                        <div className={`flex items-center text-xs ${
                          passwordStrength.hasLowercase ? 'text-emerald-300' : 'text-muted'
                        }`}>
                          <span className="mr-2">{passwordStrength.hasLowercase ? '✓' : '○'}</span>
                          One lowercase letter (a-z)
                        </div>
                        <div className={`flex items-center text-xs ${
                          passwordStrength.hasNumber ? 'text-emerald-300' : 'text-muted'
                        }`}>
                          <span className="mr-2">{passwordStrength.hasNumber ? '✓' : '○'}</span>
                          One number (0-9)
                        </div>
                        <div className={`flex items-center text-xs ${
                          passwordStrength.hasSymbol ? 'text-emerald-300' : 'text-muted'
                        }`}>
                          <span className="mr-2">{passwordStrength.hasSymbol ? '✓' : '○'}</span>
                          One symbol (!@#$%^&*...)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isSignUp && signUpStep === 1 && (
                <div>
                  <label htmlFor="authpage-confirm-password" className="block text-sm font-medium text-ink/75 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-muted" />
                    </div>
                    <input id="authpage-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent transition-all ${
                        errors.confirmPassword ? 'border-red-500' : 'border-hairline'
                      }`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-muted hover:text-ink" />
                      ) : (
                        <Eye className="h-5 w-5 text-muted hover:text-ink" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-300">{errors.confirmPassword}</p>}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex space-x-3">
                {isSignUp && signUpStep === 2 && (
                  <button
                    type="button"
                    onClick={goBackToStep1}
                    className="flex-1 px-4 py-3 border border-hairline text-ink/75 rounded-lg hover:bg-surface transition-colors"
                  >
                    Back
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl btn-primary"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {isSignUp ? (signUpStep === 1 ? 'Next...' : 'Creating Account...') : 'Signing In...'}
                    </div>
                  ) : (
                    isSignUp ? (signUpStep === 1 ? 'Next' : 'Create Account') : 'Sign In'
                  )}
                </button>
              </div>
            </form>
            )}

            {/* Forgot Password Link */}
            {!isSignUp && !showForgotPassword && signUpStep === 1 && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-sand hover:text-ink font-medium transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {signUpStep === 1 && !showForgotPassword && (
              <div className="mt-6 text-center">
                <p className="text-ink/75">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  <button
                    onClick={toggleMode}
                    className="ml-2 text-sand hover:text-ink font-medium transition-colors"
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </button>
                </p>
              </div>
            )}

            {/* Demo Account Info */}
            {!isSignUp && !error && !showForgotPassword && (
              <div className="mt-6 p-4 bg-surface rounded-lg">
                <p className="text-sm text-ink text-center">
                  <strong>Note:</strong> Create an account or sign in with your credentials
                </p>
              </div>
            )}
            
            {/* Error Display */}
            {error && !showForgotPassword && (
              <div className="mt-6 p-4 bg-red-500/10 rounded-lg">
                {error.includes('User already registered') || error.includes('user_already_exists') ? (
                  <div className="text-center">
                    <p className="text-sm text-red-300 mb-2">
                      An account with this email already exists.
                    </p>
                    <button
                      onClick={() => {
                        setIsSignUp(false);
                        setSignUpStep(1);
                        setErrors({});
                      }}
                      className="text-sm text-sand hover:text-ink font-medium underline"
                    >
                      Sign in instead
                    </button>
                  </div>
                ) : error.includes('Invalid login credentials') || error.includes('invalid_credentials') || error.includes('Invalid') ? (
                  <div className="text-center">
                    <p className="text-sm text-red-300 mb-2">
                      Invalid email or password. Please check your credentials and try again.
                    </p>
                    <button
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-sand hover:text-ink font-medium underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                ) : error.includes('Email not confirmed') ? (
                  <p className="text-sm text-red-300 text-center">
                    Please check your email and confirm your account before signing in.
                  </p>
                ) : (
                  <p className="text-sm text-red-300 text-center">
                    {error}
                  </p>
                )}
              </div>
            )}
            
            {/* Reset Success Message */}
            {resetMessage && showForgotPassword && (
              <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg">
                <p className="text-sm text-emerald-300 text-center">
                  {resetMessage}
                </p>
              </div>
            )}

            {/* Reset Error Display */}
            {resetError && showForgotPassword && (
              <div className="mt-6 p-4 bg-red-500/10 rounded-lg">
                <p className="text-sm text-red-300 text-center">
                  {resetError}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};