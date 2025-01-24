import React, { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useOrbis } from '@orbisclub/components';
import { LoadingCircle } from './Icons';
import { getIpfsLink, sleep } from '../utils';
import { HiLink, HiCode, HiPhotograph, HiSparkles } from 'react-icons/hi'; // Added HiSparkles for AI icon
import { POINTS_RULES } from '../config/points';

const Editor = ({ post, onPostCreated }) => {
  const { orbis, user } = useOrbis();
  const [title, setTitle] = useState(post?.content?.title || '');
  const [body, setBody] = useState(post?.content?.body || '');
  const [media, setMedia] = useState(post?.content?.media || []);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [category, setCategory] = useState(post?.content?.context || '');
  const [status, setStatus] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false); // State for AI loading
  const dropdownRef = useRef(null);
  const textareaRef = useRef();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const wrapText = (before, after, defaultText = '') => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || defaultText;

    const newText =
      textarea.value.substring(0, start) +
      before +
      selectedText +
      after +
      textarea.value.substring(end);

    setBody(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const addBold = () => wrapText('**', '**', 'bold text');
  const addItalic = () => wrapText('_', '_', 'italic text');
  const addHeading2 = () => wrapText('## ', '\n', 'Heading 2');
  const addHeading3 = () => wrapText('### ', '\n', 'Heading 3');
  const addCodeBlock = () => wrapText('```\n', '\n```', 'code block');
  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      wrapText('[', `](${url})`, 'link text');
    }
  };

  const addImage = async (event) => {
    setMediaLoading(true);
    const file = event.target.files[0];
    if (file && file.type.match(/^image\//)) {
      let res = await orbis.uploadMedia(file);
      if (res.status == 200) {
        wrapText('![', `](${getIpfsLink(res.result)})`, 'Image description');
        setMedia([...media, res.result]);
      } else {
        alert('Error uploading image.');
      }
    }
    setMediaLoading(false);
  };

  // Function to generate post content using OpenAI
  const generatePostWithAI = async () => {
    if (!user) {
      alert('You must be connected to use this feature.');
      return;
    }

    setIsAILoading(true);

    try {
      // Call the OpenAI API to generate content
      const prompt = "Write a short post about building in web3.";
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate post');
      }

      const { content } = await response.json();

      // Set the generated content in the editor
      setBody(content);
    } catch (error) {
      console.error('Error generating post:', error);
      alert('Failed to generate post. Please try again.');
    } finally {
      setIsAILoading(false);
    }
  };

  // Function to award points
  async function awardPoints(did, points) {
    try {
      const response = await fetch('/api/award-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ did, points }),
      });

      if (!response.ok) {
        throw new Error('Failed to award points');
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  }

  async function updateArticle() {
    if (!category) {
      alert('Please select a category');
      return;
    }

    setStatus(1); // Set status to "loading"
    let res;

    // Update or create the post
    if (post) {
      let _content = { ...post.content };
      let _data = { ...post.content.data };
      _content.title = title;
      _content.body = body;
      _content.data = _data;
      _content.media = media;
      _content.context = category;
      res = await orbis.editPost(post.stream_id, _content);
    } else {
      res = await orbis.createPost({
        title: title,
        body: body,
        context: category,
        media: media,
      });

      // Award points for creating a post
      if (res.status === 200 && user) {
        await awardPoints(user.did, POINTS_RULES.CREATE_POST);
      }
    }

    console.log('Post creation/edit response:', res); // Debugging log

    if (res.status == 200) {
      setStatus(2); // Set status to "success"
      await sleep(1500);

      // Call the refetch function passed as a prop
      if (onPostCreated) {
        onPostCreated();
      }

      // Reset the form
      setTitle('');
      setBody('');
      setMedia([]);
      setCategory('');
      setStatus(0);

      // Debugging: Fetch the post manually
      const newPost = await orbis.getPost(res.stream);
      console.log('New post fetched:', newPost); // Debugging log
    } else {
      setStatus(3); // Set status to "error"
      await sleep(2500);
      setStatus(0);
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm">
      <div className="p-4">
        {/* User Avatar and Input Area */}
        <div className="flex items-start space-x-3">
          <div className="flex-grow">
            <TextareaAutosize
              placeholder="What are you Building?"
              className="w-full resize-none text-gray-900 placeholder-gray-500 p-2 focus:outline-none text-md border border-gray-300 rounded-lg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <TextareaAutosize
              ref={textareaRef}
              placeholder="Description"
              className="w-full resize-none text-gray-900 placeholder-gray-500 p-2 focus:outline-none min-h-[100px] border border-gray-300 rounded-lg mt-2"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center space-x-2">
            {/* AI Button */}
            <ToolbarIconButton
              onClick={generatePostWithAI}
              loading={isAILoading}
            >
              <HiSparkles className="w-5 h-5" /> {/* AI Icon */}
            </ToolbarIconButton>

            <ToolbarIconButton
              onClick={addImage}
              isImage={true}
              loading={mediaLoading}
            >
              <HiPhotograph className="w-5 h-5" /> {/* Image Icon */}
            </ToolbarIconButton>
            <ToolbarIconButton onClick={addBold}>
              <span className="font-bold">B</span>
            </ToolbarIconButton>
            <ToolbarIconButton onClick={addItalic}>
              <span className="italic">I</span>
            </ToolbarIconButton>
            <ToolbarIconButton onClick={addLink}>
              <HiLink className="w-5 h-5" /> {/* Link Icon */}
            </ToolbarIconButton>
            <ToolbarIconButton onClick={addCodeBlock}>
              <HiCode className="w-5 h-5" /> {/* Code Icon */}
            </ToolbarIconButton>

            {/* Category Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center px-3 py-1.5 text-sm font-small text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                {category || 'Category'}
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 max-h-64 overflow-y-auto">
                  {[
                    'projects',
                    'ai-agents',
                    'dapps',
                    'public-goods',
                    'events',
                    'research',
                    'governance',
                    'tutorials',
                    'announcements',
                    'discussions',
                    'nfts',
                    'defi',
                    'dao',
                    'gaming',
                    'metaverse',
                    'infrastructure',
                    'security',
                    'privacy',
                    'scaling',
                    'layer2',
                  ].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {cat.charAt(0).toUpperCase() +
                        cat.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Post Button */}
          <button
            onClick={updateArticle}
            disabled={!category || !title || !body || status === 1}
            className={`px-4 py-1.5 rounded-full font-medium ${
              status === 1
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : !category || !title || !body
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {status === 1 ? (
              <div className="flex items-center">
                <LoadingCircle className="w-4 h-4 mr-2" />
                Posting...
              </div>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToolbarIconButton = ({ children, onClick, isImage, loading }) => {
  if (isImage) {
    return (
      <>
        {loading ? (
          <button
            disabled
            className="p-2 text-gray-500 rounded-full hover:bg-gray-100"
          >
            <LoadingCircle className="w-5 h-5" />
          </button>
        ) : (
          <>
            <input
              type="file"
              id="imageInputPost"
              className="hidden"
              accept="image/*"
              onChange={onClick}
            />
            <label
              htmlFor="imageInputPost"
              className="p-2 text-gray-500 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              {children}
            </label>
          </>
        )}
      </>
    );
  }

  return (
    <button
      onClick={onClick}
      className="p-2 text-gray-500 rounded-full hover:bg-gray-100"
    >
      {children}
    </button>
  );
};

export default Editor;